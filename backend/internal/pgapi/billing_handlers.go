package pgapi

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xploitverse/backend/internal/services"
)

// billingPlan is the server-side subscription catalogue. Amounts are stored in
// paise (smallest INR unit) and mirrored to Razorpay plans lazily.
type billingPlan struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	AmountPaise int64    `json:"amountPaise"`
	Period      string   `json:"period"`
	Features    []string `json:"features"`
}

var billingPlans = []billingPlan{
	{
		Key: "pro", Name: "Pro", AmountPaise: 79900, Period: "monthly",
		Features: []string{
			"Access to premium ranges",
			"Extended 4-hour lab sessions",
			"Full solution guides and hints",
			"Priority spin-up capacity",
		},
	},
	{
		Key: "elite", Name: "Elite", AmountPaise: 199900, Period: "monthly",
		Features: []string{
			"Everything in Pro",
			"Exclusive advanced attack ranges",
			"Concurrent lab sessions",
			"Early access to new content",
		},
	},
}

func planByKey(key string) *billingPlan {
	for i := range billingPlans {
		if billingPlans[i].Key == strings.ToLower(strings.TrimSpace(key)) {
			return &billingPlans[i]
		}
	}
	return nil
}

func (a *API) razorpay() *services.RazorpayClient {
	return services.NewRazorpayClient(a.Cfg.Razorpay.KeyID, a.Cfg.Razorpay.KeySecret)
}

// ensureBillingSchema creates the additive billing tables. Safe to call on every
// boot; each statement is idempotent.
func ensureBillingSchema(ctx context.Context, db *pgxpool.Pool) {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS subscriptions (
			user_id BIGINT PRIMARY KEY,
			plan TEXT NOT NULL DEFAULT 'free',
			status TEXT NOT NULL DEFAULT 'none',
			razorpay_subscription_id TEXT NOT NULL DEFAULT '',
			razorpay_payment_id TEXT NOT NULL DEFAULT '',
			current_end_ts BIGINT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS razorpay_plans (
			plan_key TEXT PRIMARY KEY,
			razorpay_plan_id TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS premium_rooms (
			room_id BIGINT PRIMARY KEY
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(ctx, s); err != nil {
			log.Printf("billing schema ensure failed: %v", err)
			return
		}
	}
}

// GetPlans exposes the subscription catalogue (public).
func (a *API) GetPlans(c *gin.Context) {
	out := make([]gin.H, 0, len(billingPlans))
	for _, p := range billingPlans {
		out = append(out, gin.H{
			"key":         p.Key,
			"name":        p.Name,
			"currency":    "INR",
			"amount":      p.AmountPaise,
			"amountRupee": p.AmountPaise / 100,
			"period":      p.Period,
			"features":    p.Features,
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"plans":      out,
			"configured": a.razorpay().Configured(),
		},
	})
}

// GetSubscriptionStatus returns the caller's current entitlements.
func (a *API) GetSubscriptionStatus(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	view, err := a.subscriptionView(c.Request.Context(), u.ID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load subscription")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": view})
}

func (a *API) subscriptionView(ctx context.Context, userID int64) (gin.H, error) {
	var plan, status, subID string
	var endTS int64
	err := a.DB.QueryRow(ctx, `
		SELECT plan, status, razorpay_subscription_id, current_end_ts
		FROM subscriptions WHERE user_id=$1
	`, userID).Scan(&plan, &status, &subID, &endTS)
	if errors.Is(err, pgx.ErrNoRows) {
		return gin.H{"plan": "free", "status": "none", "active": false}, nil
	}
	if err != nil {
		return nil, err
	}
	return gin.H{
		"plan":           plan,
		"status":         status,
		"active":         isActiveStatus(status),
		"subscriptionId": subID,
		"currentEnd":     endTS,
	}, nil
}

func isActiveStatus(status string) bool {
	switch status {
	case "active", "pending", "authenticated":
		return true
	default:
		return false
	}
}

// CreateSubscription provisions a Razorpay subscription and returns the ids the
// browser Checkout needs. The key secret is never sent to the client.
func (a *API) CreateSubscription(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	rzp := a.razorpay()
	if !rzp.Configured() {
		writeErr(c, http.StatusServiceUnavailable, "Payments are not configured")
		return
	}

	var body struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "A plan is required")
		return
	}
	plan := planByKey(body.Plan)
	if plan == nil {
		writeErr(c, http.StatusBadRequest, "Unknown plan")
		return
	}

	ctx := c.Request.Context()
	planID, err := a.ensureRazorpayPlan(ctx, rzp, plan)
	if err != nil {
		log.Printf("ensure razorpay plan: %v", err)
		writeErr(c, http.StatusBadGateway, "Could not prepare the billing plan")
		return
	}

	sub, err := rzp.CreateSubscription(ctx, planID, map[string]string{
		"user_id": strconv.FormatInt(u.ID, 10),
		"plan":    plan.Key,
	})
	if err != nil {
		log.Printf("create razorpay subscription: %v", err)
		writeErr(c, http.StatusBadGateway, "Could not start the subscription")
		return
	}
	subID, _ := sub["id"].(string)
	status, _ := sub["status"].(string)
	if status == "" {
		status = "created"
	}

	_, _ = a.DB.Exec(ctx, `
		INSERT INTO subscriptions (user_id, plan, status, razorpay_subscription_id, updated_at)
		VALUES ($1, $2, $3, $4, now())
		ON CONFLICT (user_id) DO UPDATE
		SET plan=EXCLUDED.plan, status=EXCLUDED.status,
		    razorpay_subscription_id=EXCLUDED.razorpay_subscription_id, updated_at=now()
	`, u.ID, plan.Key, status, subID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"keyId":          a.Cfg.Razorpay.KeyID,
			"subscriptionId": subID,
			"plan":           plan.Key,
			"amount":         plan.AmountPaise,
			"currency":       "INR",
			"status":         status,
		},
	})
}

// ensureRazorpayPlan returns a cached Razorpay plan id, creating the plan once.
func (a *API) ensureRazorpayPlan(ctx context.Context, rzp *services.RazorpayClient, plan *billingPlan) (string, error) {
	var cached string
	err := a.DB.QueryRow(ctx, `SELECT razorpay_plan_id FROM razorpay_plans WHERE plan_key=$1`, plan.Key).Scan(&cached)
	if err == nil && cached != "" {
		return cached, nil
	}

	created, err := rzp.CreatePlan(ctx, fmt.Sprintf("XploitVerse %s (%s)", plan.Name, plan.Period), plan.AmountPaise, plan.Period)
	if err != nil {
		return "", err
	}
	_, _ = a.DB.Exec(ctx, `
		INSERT INTO razorpay_plans (plan_key, razorpay_plan_id)
		VALUES ($1, $2)
		ON CONFLICT (plan_key) DO UPDATE SET razorpay_plan_id=EXCLUDED.razorpay_plan_id
	`, plan.Key, created)
	return created, nil
}

// VerifySubscriptionPayment validates the Checkout callback signature and
// re-reads the subscription from Razorpay before granting access.
func (a *API) VerifySubscriptionPayment(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	rzp := a.razorpay()

	var body struct {
		RazorpayPaymentID      string `json:"razorpay_payment_id"`
		RazorpaySubscriptionID string `json:"razorpay_subscription_id"`
		RazorpaySignature      string `json:"razorpay_signature"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Invalid payload")
		return
	}
	if body.RazorpaySubscriptionID == "" || body.RazorpayPaymentID == "" || body.RazorpaySignature == "" {
		writeErr(c, http.StatusBadRequest, "Missing payment verification fields")
		return
	}

	expected := hmacHex(a.Cfg.Razorpay.KeySecret, body.RazorpaySubscriptionID+"|"+body.RazorpayPaymentID)
	if subtle.ConstantTimeCompare([]byte(expected), []byte(strings.ToLower(body.RazorpaySignature))) != 1 {
		writeErr(c, http.StatusBadRequest, "Payment verification failed")
		return
	}

	// Confirm authoritative state from Razorpay rather than trusting the client.
	status := "active"
	var endTS int64
	if rzp.Configured() {
		if fetched, err := rzp.FetchSubscription(c.Request.Context(), body.RazorpaySubscriptionID); err == nil {
			if s, ok := fetched["status"].(string); ok && s != "" {
				status = s
			}
			if et, ok := fetched["current_end_time"].(float64); ok {
				endTS = int64(et)
			}
		}
	}

	_, _ = a.DB.Exec(c.Request.Context(), `
		UPDATE subscriptions
		SET status=$2, razorpay_payment_id=$3, current_end_ts=$4, updated_at=now()
		WHERE user_id=$1
	`, u.ID, status, body.RazorpayPaymentID, endTS)

	view, _ := a.subscriptionView(c.Request.Context(), u.ID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription activated", "data": view})
}

// CancelSubscription stops renewal and marks the row cancelled.
func (a *API) CancelSubscription(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	var subID string
	_ = a.DB.QueryRow(c.Request.Context(), `SELECT razorpay_subscription_id FROM subscriptions WHERE user_id=$1`, u.ID).Scan(&subID)

	rzp := a.razorpay()
	if rzp.Configured() && subID != "" {
		if err := rzp.CancelSubscription(c.Request.Context(), subID); err != nil {
			log.Printf("cancel razorpay subscription: %v", err)
		}
	}
	_, _ = a.DB.Exec(c.Request.Context(), `UPDATE subscriptions SET status='cancelled', updated_at=now() WHERE user_id=$1`, u.ID)
	view, _ := a.subscriptionView(c.Request.Context(), u.ID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription cancelled", "data": view})
}

// RazorpayWebhook handles asynchronous subscription/payment events. It verifies
// the HMAC of the raw body against the configured webhook secret.
func (a *API) RazorpayWebhook(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// Fail closed: without a configured secret every event would be unauthenticated,
	// so the endpoint is disabled rather than trusted.
	secret := a.Cfg.Razorpay.WebhookSecret
	if secret == "" {
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "Webhook secret not configured"})
		return
	}
	sig := c.GetHeader("X-Razorpay-Signature")
	expected := hmacHex(secret, string(raw))
	if subtle.ConstantTimeCompare([]byte(expected), []byte(strings.ToLower(sig))) != 1 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid webhook signature"})
		return
	}

	var event struct {
		Event      string `json:"event"`
		PayloadSub struct {
			Entity map[string]interface{} `json:"entity"`
		} `json:"payload"`
		Payment struct {
			Entity struct {
				SubscriptionID string `json:"subscription_id"`
			} `json:"entity"`
		} `json:"payment"`
	}
	// Respond fast; process best-effort.
	c.JSON(http.StatusOK, gin.H{"status": "ok"})

	if err := json.Unmarshal(raw, &event); err != nil {
		return
	}
	subID, _ := event.PayloadSub.Entity["id"].(string)
	if subID == "" {
		subID = event.Payment.Entity.SubscriptionID
	}
	if subID == "" {
		return
	}

	status, _ := event.PayloadSub.Entity["status"].(string)
	if status == "" {
		switch {
		case strings.Contains(event.Event, "cancelled"):
			status = "cancelled"
		case strings.Contains(event.Event, "charged"):
			status = "active"
		}
	}
	var endTS int64
	if et, ok := event.PayloadSub.Entity["current_end_time"].(float64); ok {
		endTS = int64(et)
	}
	if status != "" {
		_, _ = a.DB.Exec(context.Background(), `
			UPDATE subscriptions SET status=$2, current_end_ts=COALESCE(NULLIF($3,0), current_end_ts), updated_at=now()
			WHERE razorpay_subscription_id=$1
		`, subID, status, endTS)
	}
}

// --- gating helpers ---

// isPremiumRoom reports whether a room is locked behind a subscription.
func (a *API) isPremiumRoom(ctx context.Context, roomID int64) bool {
	if roomID <= 0 {
		return false
	}
	var one int
	err := a.DB.QueryRow(ctx, `SELECT 1 FROM premium_rooms WHERE room_id=$1`, roomID).Scan(&one)
	return err == nil
}

// premiumRoomSet loads the full set of subscription-locked room ids in one pass.
func (a *API) premiumRoomSet(ctx context.Context) map[int64]bool {
	set := map[int64]bool{}
	rows, err := a.DB.Query(ctx, `SELECT room_id FROM premium_rooms`)
	if err != nil {
		return set
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			set[id] = true
		}
	}
	return set
}

// activeSubscriber reports whether the user currently holds a paid entitlement.
func (a *API) activeSubscriber(ctx context.Context, userID int64) bool {
	var status string
	err := a.DB.QueryRow(ctx, `SELECT status FROM subscriptions WHERE user_id=$1`, userID).Scan(&status)
	if err != nil {
		return false
	}
	return isActiveStatus(status)
}

// requirePremiumAccess writes a 403 (SUBSCRIPTION_REQUIRED) and returns false
// when the room is premium and the caller is not an active subscriber. Instructors
// and admins bypass the gate.
func (a *API) requirePremiumAccess(c *gin.Context, roomID int64) bool {
	u := getAuthUser(c)
	if u == nil {
		return false
	}
	if u.Role != roleStudent {
		return true
	}
	if !a.isPremiumRoom(c.Request.Context(), roomID) {
		return true
	}
	if a.activeSubscriber(c.Request.Context(), u.ID) {
		return true
	}
	c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
		"success": false,
		"code":    "SUBSCRIPTION_REQUIRED",
		"message": "This range requires an active subscription.",
	})
	return false
}

// SetRoomPremium lets an admin mark a course (room) as subscription-only.
func (a *API) SetRoomPremium(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	if u.Role != roleAdmin {
		writeErr(c, http.StatusForbidden, "Admins only")
		return
	}
	roomID, ok := parseInt64Param(c, "roomId")
	if !ok {
		return
	}
	var body struct {
		Premium bool `json:"premium"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Invalid payload")
		return
	}
	if body.Premium {
		_, _ = a.DB.Exec(c.Request.Context(), `INSERT INTO premium_rooms (room_id) VALUES ($1) ON CONFLICT DO NOTHING`, roomID)
	} else {
		_, _ = a.DB.Exec(c.Request.Context(), `DELETE FROM premium_rooms WHERE room_id=$1`, roomID)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"roomId": roomID, "premium": body.Premium}})
}

func hmacHex(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}
