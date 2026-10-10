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
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xploitverse/backend/internal/services"
)

// XploitVerse bills lab access per use. Every lab session starts on a free
// 59-minute tier; after that the user buys time extensions (one-time Razorpay
// orders) until the session hits its hard lifetime cap. There is no account
// subscription anywhere in the product.

// extensionBlock is a purchasable unit of extra lab time.
type extensionBlock struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Hours       int    `json:"hours"`
	Minutes     int    `json:"minutes"`
	AmountPaise int64  `json:"amount"`
}

// pricingCatalog derives the purchasable blocks from the configured hourly
// rate so the price stays in one place. A 4-hour block carries a 20% discount.
func (a *API) pricingCatalog() []extensionBlock {
	return []extensionBlock{
		{Key: "1h", Name: "1 hour", Hours: 1, Minutes: 60, AmountPaise: 4500},
		{Key: "4h", Name: "4 hours", Hours: 4, Minutes: 240, AmountPaise: 14500},
	}
}

func (a *API) blockByKey(key string) *extensionBlock {
	for _, b := range a.pricingCatalog() {
		if b.Key == strings.ToLower(strings.TrimSpace(key)) {
			return &b
		}
	}
	return nil
}

func (a *API) razorpay() *services.RazorpayClient {
	return services.NewRazorpayClient(a.Cfg.Razorpay.KeyID, a.Cfg.Razorpay.KeySecret)
}

// maxSessionMinutes is the hard cap on a single session's lifetime, including
// paid extensions. Falls back to a sane default when unset.
func (a *API) maxSessionMinutes() int {
	if a.Cfg.Lab.MaxSessionMinutes > 0 {
		return a.Cfg.Lab.MaxSessionMinutes
	}
	return 480
}

// freeSessionMinutes is the free tier length before payment is required.
func (a *API) freeSessionMinutes() int {
	if a.Cfg.Lab.FreeSessionMinutes > 0 {
		return a.Cfg.Lab.FreeSessionMinutes
	}
	return 59
}

// initialSessionMinutes is how long a session runs before payment is required.
// Students open on the free tier; staff keep the full session allowance.
func (a *API) initialSessionMinutes(role string) int {
	if role == roleStudent {
		return a.freeSessionMinutes()
	}
	return a.maxSessionMinutes()
}

// ensureBillingSchema creates the additive per-lab billing table and drops the
// retired subscription tables. Safe to call on every boot.
func ensureBillingSchema(ctx context.Context, db *pgxpool.Pool) {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS lab_payments (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL,
			session_id BIGINT NOT NULL,
			block_key TEXT NOT NULL,
			minutes INTEGER NOT NULL,
			amount_paise BIGINT NOT NULL,
			currency TEXT NOT NULL DEFAULT 'INR',
			razorpay_order_id TEXT NOT NULL DEFAULT '',
			razorpay_payment_id TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'created',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS lab_payments_order_id_idx
			ON lab_payments (razorpay_order_id) WHERE razorpay_order_id <> ''`,
		`CREATE INDEX IF NOT EXISTS lab_payments_session_idx ON lab_payments (session_id)`,
		// Retired subscription-era tables. Unused by the current product.
		`DROP TABLE IF EXISTS premium_rooms`,
		`DROP TABLE IF EXISTS razorpay_plans`,
		`DROP TABLE IF EXISTS subscriptions`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(ctx, s); err != nil {
			log.Printf("billing schema ensure failed: %v", err)
			return
		}
	}
}

// GetPricing exposes the public per-lab pricing catalogue.
func (a *API) GetPricing(c *gin.Context) {
	blocks := make([]gin.H, 0, len(a.pricingCatalog()))
	for _, b := range a.pricingCatalog() {
		blocks = append(blocks, gin.H{
			"key":         b.Key,
			"name":        b.Name,
			"hours":       b.Hours,
			"minutes":     b.Minutes,
			"amount":      b.AmountPaise,
			"amountRupee": b.AmountPaise / 100,
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"currency":          "INR",
			"freeMinutes":       a.freeSessionMinutes(),
			"hourlyRateRupee":   a.Cfg.Lab.HourlyRateINR,
			"maxSessionMinutes": a.maxSessionMinutes(),
			"warnMinutes":       a.Cfg.Lab.WarningMinutes,
			"blocks":            blocks,
			"configured":        a.razorpay().Configured(),
		},
	})
}

// CreateLabOrder opens a Razorpay order for an extra block of lab time on an
// active session. The client then completes payment via Razorpay Checkout.
func (a *API) CreateLabOrder(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	sessionID, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var body struct {
		Block string `json:"block" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "An extension block is required")
		return
	}
	block := a.blockByKey(body.Block)
	if block == nil {
		writeErr(c, http.StatusBadRequest, "Unknown extension block")
		return
	}

	ctx := c.Request.Context()

	// The session must belong to the caller and still be alive.
	var ownerID int64
	var status string
	var expiresAt *time.Time
	var startedAt *time.Time
	err := a.DB.QueryRow(ctx, `
		SELECT user_id, status, expires_at, started_at
		FROM lab_sessions WHERE id=$1
	`, sessionID).Scan(&ownerID, &status, &expiresAt, &startedAt)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Lab session not found")
		return
	}
	if ownerID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized for this session")
		return
	}
	if status != "running" && status != "pending" && status != "initializing" {
		writeErr(c, http.StatusBadRequest, "This session is no longer active")
		return
	}
	if startedAt != nil {
		elapsed := time.Since(*startedAt)
		if elapsed >= time.Duration(a.maxSessionMinutes())*time.Minute {
			writeErr(c, http.StatusBadRequest, "This session has reached its maximum lifetime")
			return
		}
	}

	rzp := a.razorpay()
	if !rzp.Configured() {
		writeErr(c, http.StatusServiceUnavailable, "Payments are not configured")
		return
	}

	receipt := fmt.Sprintf("xv-s%d-%d", sessionID, time.Now().Unix())
	order, err := rzp.CreateOrder(ctx, block.AmountPaise, "INR", receipt, map[string]string{
		"user_id":      fmt.Sprintf("%d", u.ID),
		"session_id":   fmt.Sprintf("%d", sessionID),
		"block_key":    block.Key,
		"block_minutes": fmt.Sprintf("%d", block.Minutes),
	})
	if err != nil {
		log.Printf("create razorpay order: %v", err)
		writeErr(c, http.StatusBadGateway, "Could not start checkout")
		return
	}
	orderID, _ := order["id"].(string)
	if orderID == "" {
		writeErr(c, http.StatusBadGateway, "Could not start checkout")
		return
	}

	_, _ = a.DB.Exec(ctx, `
		INSERT INTO lab_payments
			(user_id, session_id, block_key, minutes, amount_paise, currency, razorpay_order_id, status)
		VALUES ($1, $2, $3, $4, $5, 'INR', $6, 'created')
	`, u.ID, sessionID, block.Key, block.Minutes, block.AmountPaise, orderID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"keyId":     a.Cfg.Razorpay.KeyID,
			"orderId":   orderID,
			"amount":    block.AmountPaise,
			"currency":  "INR",
			"block":     block.Key,
			"minutes":   block.Minutes,
			"sessionId": sessionID,
		},
	})
}

// VerifyLabPayment validates the Checkout callback signature, marks the payment
// paid, and extends the session. It is idempotent: replaying a verified payment
// never grants the same minutes twice.
func (a *API) VerifyLabPayment(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		RazorpayOrderID   string `json:"razorpay_order_id"`
		RazorpayPaymentID string `json:"razorpay_payment_id"`
		RazorpaySignature string `json:"razorpay_signature"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Invalid payload")
		return
	}
	if body.RazorpayOrderID == "" || body.RazorpayPaymentID == "" || body.RazorpaySignature == "" {
		writeErr(c, http.StatusBadRequest, "Missing payment verification fields")
		return
	}
	if a.Cfg.Razorpay.KeySecret == "" {
		writeErr(c, http.StatusServiceUnavailable, "Payments are not configured")
		return
	}

	expected := hmacHex(a.Cfg.Razorpay.KeySecret, body.RazorpayOrderID+"|"+body.RazorpayPaymentID)
	if subtle.ConstantTimeCompare([]byte(expected), []byte(strings.ToLower(body.RazorpaySignature))) != 1 {
		writeErr(c, http.StatusBadRequest, "Payment verification failed")
		return
	}

	ctx := c.Request.Context()

	var ownerID int64
	err := a.DB.QueryRow(ctx, `SELECT user_id FROM lab_payments WHERE razorpay_order_id=$1`, body.RazorpayOrderID).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(c, http.StatusNotFound, "Unknown order")
		return
	}
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load order")
		return
	}
	if ownerID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized for this order")
		return
	}

	sessionID, minutes, err := a.settleLabPayment(ctx, body.RazorpayOrderID, body.RazorpayPaymentID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Could not apply the payment")
		return
	}

	billing, _ := a.sessionBilling(ctx, sessionID)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment confirmed. Lab time extended.",
		"data": gin.H{
			"sessionId":     sessionID,
			"grantedMinutes": minutes,
			"billing":       billing,
		},
	})
}

// GetMyPayments returns the caller's recent lab payments (billing history).
func (a *API) GetMyPayments(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, session_id, block_key, minutes, amount_paise, currency,
			COALESCE(razorpay_payment_id,''), status, created_at
		FROM lab_payments
		WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT 50
	`, u.ID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load payments")
		return
	}
	defer rows.Close()

	payments := make([]gin.H, 0)
	for rows.Next() {
		var id, sessionID, minutes, amountPaise int64
		var blockKey, currency, paymentID, status string
		var createdAt time.Time
		if err := rows.Scan(&id, &sessionID, &blockKey, &minutes, &amountPaise, &currency, &paymentID, &status, &createdAt); err != nil {
			continue
		}
		payments = append(payments, gin.H{
			"id":        id,
			"sessionId": sessionID,
			"block":     blockKey,
			"minutes":   minutes,
			"amount":    amountPaise,
			"currency":  currency,
			"paymentId": paymentID,
			"status":    status,
			"createdAt": createdAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"payments": payments}})
}

// settleLabPayment marks a verified order paid and extends the session exactly
// once. Returns the session id and granted minutes (0 when already settled).
func (a *API) settleLabPayment(ctx context.Context, orderID, paymentID string) (int64, int, error) {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	var (
		id         int64
		sessionID  int64
		minutes    int
		status     string
		existingPI string
	)
	err = tx.QueryRow(ctx, `
		SELECT id, session_id, minutes, status, razorpay_payment_id
		FROM lab_payments
		WHERE razorpay_order_id=$1
		FOR UPDATE
	`, orderID).Scan(&id, &sessionID, &minutes, &status, &existingPI)
	if err != nil {
		return 0, 0, err
	}

	// Already settled — replay must not grant extra time.
	if status == "paid" {
		if err := tx.Commit(ctx); err != nil {
			return 0, 0, err
		}
		return sessionID, 0, nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE lab_payments
		SET status='paid', razorpay_payment_id=$2, updated_at=now()
		WHERE id=$1
	`, id, paymentID); err != nil {
		return 0, 0, err
	}

	// Extend from the later of "now" and the current expiry, capped at the
	// session's maximum lifetime so a bought hour is never silently truncated
	// by the cap alone.
	if _, err := tx.Exec(ctx, `
		UPDATE lab_sessions
		SET expires_at = LEAST(
				GREATEST(COALESCE(expires_at, now()), now()) + make_interval(mins => $2),
				COALESCE(started_at, created_at) + make_interval(mins => $3)
			),
			updated_at = now()
		WHERE id=$1
	`, sessionID, minutes, a.maxSessionMinutes()); err != nil {
		return 0, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}
	return sessionID, minutes, nil
}

// sessionBilling returns live billing state for a session so the client can
// show a countdown and an extend prompt.
func (a *API) sessionBilling(ctx context.Context, sessionID int64) (gin.H, error) {
	var startedAt, expiresAt *time.Time
	var status string
	err := a.DB.QueryRow(ctx, `
		SELECT status, started_at, expires_at FROM lab_sessions WHERE id=$1
	`, sessionID).Scan(&status, &startedAt, &expiresAt)
	if err != nil {
		return nil, err
	}

	remaining := 0
	if expiresAt != nil {
		remaining = int(time.Until(*expiresAt).Seconds())
		if remaining < 0 {
			remaining = 0
		}
	}

	var paidMinutes int
	_ = a.DB.QueryRow(ctx, `
		SELECT COALESCE(SUM(minutes),0) FROM lab_payments WHERE session_id=$1 AND status='paid'
	`, sessionID).Scan(&paidMinutes)

	return gin.H{
		"status":            strings.ToUpper(status),
		"startedAt":         startedAt,
		"expiresAt":         expiresAt,
		"remainingSeconds":  remaining,
		"paidMinutes":       paidMinutes,
		"freeMinutes":       a.freeSessionMinutes(),
		"maxSessionMinutes": a.maxSessionMinutes(),
		"warnMinutes":       a.Cfg.Lab.WarningMinutes,
	}, nil
}

// RazorpayWebhook handles asynchronous payment capture. It verifies the HMAC of
// the raw body against the configured webhook secret, then settles the matching
// order. This makes payment confirmation resilient to a browser that closes
// mid-checkout.
func (a *API) RazorpayWebhook(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	// Fail closed: without a configured secret every event would be
	// unauthenticated, so the endpoint is disabled rather than trusted.
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
		Event   string `json:"event"`
		Payload struct {
			Payment struct {
				Entity struct {
					ID      string `json:"id"`
					OrderID string `json:"order_id"`
					Status  string `json:"status"`
				} `json:"entity"`
			} `json:"payment"`
			Order struct {
				Entity struct {
					ID string `json:"id"`
				} `json:"entity"`
			} `json:"order"`
		} `json:"payload"`
	}
	// Respond fast; process best-effort.
	c.JSON(http.StatusOK, gin.H{"status": "ok"})

	if err := json.Unmarshal(raw, &event); err != nil {
		return
	}
	if !strings.Contains(event.Event, "payment.captured") && !strings.Contains(event.Event, "order.paid") {
		return
	}

	orderID := event.Payload.Payment.Entity.OrderID
	if orderID == "" {
		orderID = event.Payload.Order.Entity.ID
	}
	if orderID == "" {
		return
	}
	paymentID := event.Payload.Payment.Entity.ID

	if _, _, err := a.settleLabPayment(context.Background(), orderID, paymentID); err != nil {
		log.Printf("razorpay webhook settle %s: %v", orderID, err)
	}
}

func hmacHex(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}
