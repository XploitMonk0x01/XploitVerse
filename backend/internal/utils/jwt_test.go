package utils

import (
	"testing"
	"time"

	"github.com/xploitverse/backend/internal/config"
)

func TestGenerateAndVerifyToken(t *testing.T) {
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:          "test-secret-key-that-is-at-least-32-chars-long",
			ExpiresIn:       "1h",
			CookieExpiresIn: 1,
		},
		NodeEnv: "development",
	}

	userID := "42"
	token, err := GenerateToken(userID, cfg)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken returned empty token")
	}

	claims, err := VerifyToken(token, cfg)
	if err != nil {
		t.Fatalf("VerifyToken failed: %v", err)
	}
	if claims.ID != userID {
		t.Fatalf("Expected user ID %s, got %s", userID, claims.ID)
	}
}

func TestVerifyInvalidToken(t *testing.T) {
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret: "test-secret-key-that-is-at-least-32-chars-long",
		},
	}

	// Tampered token
	_, err := VerifyToken("invalid.token.structure", cfg)
	if err == nil {
		t.Fatal("Expected error for invalid token structure, got nil")
	}

	// Empty token
	_, err = VerifyToken("", cfg)
	if err == nil {
		t.Fatal("Expected error for empty token string, got nil")
	}
}

func TestParseExpiry(t *testing.T) {
	d, err := parseExpiry("7d")
	if err != nil || d != 7*24*time.Hour {
		t.Fatalf("Failed to parse 7d: %v, got %v", err, d)
	}

	d, err = parseExpiry("30m")
	if err != nil || d != 30*time.Minute {
		t.Fatalf("Failed to parse 30m: %v, got %v", err, d)
	}
}
