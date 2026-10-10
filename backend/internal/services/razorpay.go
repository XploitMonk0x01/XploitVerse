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
// (Orders + Payments). XploitVerse bills lab time per-use, so the client only
// creates one-time Orders and reads them back — there is no recurring plan or
// subscription surface. The key secret never leaves the server; only the key id
// and a created order id are ever returned to the browser.
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

// CreateOrder registers a one-time order for a lab extension and returns the
// created entity. amount is in the smallest currency unit (paise for INR).
func (r *RazorpayClient) CreateOrder(ctx context.Context, amountPaise int64, currency, receipt string, notes map[string]string) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"amount":   amountPaise,
		"currency": currency,
		"receipt":  receipt,
	}
	if len(notes) > 0 {
		payload["notes"] = notes
	}
	res, err := r.do(ctx, http.MethodPost, "/orders", payload)
	if err != nil {
		return nil, err
	}
	if _, ok := res["id"].(string); !ok {
		return nil, fmt.Errorf("razorpay order create returned no id")
	}
	return res, nil
}

// FetchOrder reads authoritative order state from Razorpay.
func (r *RazorpayClient) FetchOrder(ctx context.Context, orderID string) (map[string]interface{}, error) {
	if orderID == "" {
		return nil, fmt.Errorf("empty order id")
	}
	return r.do(ctx, http.MethodGet, "/orders/"+orderID, nil)
}

// FetchPayment reads a payment entity (used to confirm capture state).
func (r *RazorpayClient) FetchPayment(ctx context.Context, paymentID string) (map[string]interface{}, error) {
	if paymentID == "" {
		return nil, fmt.Errorf("empty payment id")
	}
	return r.do(ctx, http.MethodGet, "/payments/"+paymentID, nil)
}
