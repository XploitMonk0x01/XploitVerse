package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// RazorpayClient is a thin, dependency-free client over the Razorpay REST API
// (Subscriptions + Plans). The key secret never leaves the server; only the
// key id and a created subscription id are ever returned to the browser.
type RazorpayClient struct {
	BaseURL    string
	KeyID      string
	KeySecret  string
	HTTPClient *http.Client
}

func NewRazorpayClient(keyID, keySecret string) *RazorpayClient {
	return &RazorpayClient{
		BaseURL:    "https://api.razorpay.com/v1",
		KeyID:      keyID,
		KeySecret:  keySecret,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// Configured reports whether usable credentials are present.
func (r *RazorpayClient) Configured() bool {
	return r != nil && r.KeyID != "" && r.KeySecret != ""
}

func (r *RazorpayClient) do(ctx context.Context, method, path string, body map[string]interface{}) (map[string]interface{}, error) {
	var reqBody io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(ctx, method, r.BaseURL+path, reqBody)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(r.KeyID, r.KeySecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("razorpay %s %s: %d: %s", method, path, resp.StatusCode, string(raw))
	}

	var out map[string]interface{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &out); err != nil {
			return nil, fmt.Errorf("razorpay decode: %w (body=%s)", err, string(raw))
		}
	}
	return out, nil
}

// CreatePlan registers a recurring plan and returns its Razorpay id.
// amount is in the smallest currency unit (paise for INR).
func (r *RazorpayClient) CreatePlan(ctx context.Context, name string, amountPaise int64, period string) (string, error) {
	res, err := r.do(ctx, http.MethodPost, "/plans", map[string]interface{}{
		"period":   period,
		"interval": 1,
		"item": map[string]interface{}{
			"name":     name,
			"amount":   amountPaise,
			"currency": "INR",
		},
	})
	if err != nil {
		return "", err
	}
	id, _ := res["id"].(string)
	if id == "" {
		return "", fmt.Errorf("razorpay plan create returned no id")
	}
	return id, nil
}

// CreateSubscription starts a recurring subscription against a plan id.
func (r *RazorpayClient) CreateSubscription(ctx context.Context, planID string, notes map[string]string) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"plan_id":         planID,
		"customer_notify": 1,
		"total_count":     12,
		"quantity":        1,
	}
	if len(notes) > 0 {
		payload["notes"] = notes
	}
	res, err := r.do(ctx, http.MethodPost, "/subscriptions", payload)
	if err != nil {
		return nil, err
	}
	if _, ok := res["id"].(string); !ok {
		return nil, fmt.Errorf("razorpay subscription create returned no id")
	}
	return res, nil
}

// FetchSubscription reads authoritative subscription state from Razorpay.
func (r *RazorpayClient) FetchSubscription(ctx context.Context, subscriptionID string) (map[string]interface{}, error) {
	if subscriptionID == "" {
		return nil, fmt.Errorf("empty subscription id")
	}
	return r.do(ctx, http.MethodGet, "/subscriptions/"+subscriptionID, nil)
}

// CancelSubscription cancels an active subscription at the provider.
func (r *RazorpayClient) CancelSubscription(ctx context.Context, subscriptionID string) error {
	if subscriptionID == "" {
		return fmt.Errorf("empty subscription id")
	}
	_, err := r.do(ctx, http.MethodPost, "/subscriptions/"+subscriptionID+"/cancel", nil)
	return err
}
