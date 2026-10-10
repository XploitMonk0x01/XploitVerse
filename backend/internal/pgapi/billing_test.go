package pgapi

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"github.com/xploitverse/backend/internal/config"
)

func testAPI(rate float64, free int, max int) *API {
	return &API{Cfg: &config.Config{Lab: config.LabConfig{
		HourlyRateINR:      rate,
		FreeSessionMinutes: free,
		MaxSessionMinutes:  max,
	}}}
}

func TestPricingCatalogMatchesHourlyRate(t *testing.T) {
	a := testAPI(9, 59, 480)
	blocks := a.pricingCatalog()
	if len(blocks) != 2 {
		t.Fatalf("expected 2 blocks, got %d", len(blocks))
	}

	hourly := blocks[0]
	if hourly.Key != "1h" || hourly.Minutes != 60 {
		t.Errorf("unexpected 1h block: %+v", hourly)
	}
	// ₹45/hour -> 4500 paise.
	if hourly.AmountPaise != 4500 {
		t.Errorf("expected 4500 paise for 1h at ₹45, got %d", hourly.AmountPaise)
	}

	bundle := blocks[1]
	if bundle.Key != "4h" || bundle.Minutes != 240 {
		t.Errorf("unexpected 4h block: %+v", bundle)
	}
	// Hardcoded 4h rate: ₹145 (14500 paise).
	if bundle.AmountPaise != 14500 {
		t.Errorf("expected 14500 paise for 4h, got %d", bundle.AmountPaise)
	}
	// The bundle must be cheaper per hour than the hourly block.
	if bundle.AmountPaise*60/int64(bundle.Minutes) >= hourly.AmountPaise {
		t.Errorf("4h block is not discounted versus 1h block")
	}
}

func TestPricingCatalogFallsBackToDefaultRate(t *testing.T) {
	a := testAPI(0, 0, 0)
	blocks := a.pricingCatalog()
	if len(blocks) != 2 || blocks[0].AmountPaise != 4500 {
		t.Errorf("expected hardcoded ₹45 rate, got %+v", blocks)
	}
	if a.freeSessionMinutes() != 59 {
		t.Errorf("expected default free tier of 59, got %d", a.freeSessionMinutes())
	}
	if a.maxSessionMinutes() != 480 {
		t.Errorf("expected default cap of 480, got %d", a.maxSessionMinutes())
	}
}

func TestBlockByKey(t *testing.T) {
	a := testAPI(9, 59, 480)
	if b := a.blockByKey("1h"); b == nil || b.Minutes != 60 {
		t.Errorf("expected 1h block, got %+v", b)
	}
	if b := a.blockByKey(" 4H "); b == nil || b.Minutes != 240 {
		t.Errorf("expected normalized 4h block, got %+v", b)
	}
	if b := a.blockByKey("24h"); b != nil {
		t.Errorf("expected nil for unknown block, got %+v", b)
	}
}

func TestInitialSessionMinutesByRole(t *testing.T) {
	a := testAPI(9, 59, 480)
	if got := a.initialSessionMinutes(roleStudent); got != 59 {
		t.Errorf("student should open on the free tier (59), got %d", got)
	}
	if got := a.initialSessionMinutes(roleInstructor); got != 480 {
		t.Errorf("instructor should get the full allowance (480), got %d", got)
	}
	if got := a.initialSessionMinutes(roleAdmin); got != 480 {
		t.Errorf("admin should get the full allowance (480), got %d", got)
	}
}

func TestHmacHexMatchesStdlib(t *testing.T) {
	mac := hmac.New(sha256.New, []byte("secret"))
	mac.Write([]byte("order_123|pay_456"))
	want := hex.EncodeToString(mac.Sum(nil))

	if got := hmacHex("secret", "order_123|pay_456"); got != want {
		t.Errorf("hmacHex mismatch: got %s want %s", got, want)
	}
	// Different input must produce a different signature.
	if hmacHex("secret", "order_123|pay_999") == want {
		t.Errorf("hmacHex must change with the input")
	}
}
