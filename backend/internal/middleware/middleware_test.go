package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRateLimiter(t *testing.T) {
	limiter := NewRateLimiter(3, 1*time.Minute)

	r := gin.New()
	r.Use(limiter.Middleware())
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	// Requests 1, 2, 3 should succeed
	for i := 1; i <= 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Request %d failed with code %d", i, w.Code)
		}
	}

	// Request 4 should be rejected with 429 Too Many Requests
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("Expected 429 Too Many Requests, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse JSON body: %v", err)
	}
	if body["success"] != false {
		t.Errorf("Expected success=false, got %v", body["success"])
	}
}

func TestErrorHandler(t *testing.T) {
	cfg := &config.Config{NodeEnv: "test"}

	r := gin.New()
	r.Use(ErrorHandler(cfg))
	r.GET("/custom-error", func(c *gin.Context) {
		_ = c.Error(NewApiError("Custom forbidden access", http.StatusForbidden))
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/custom-error", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Expected status 403, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}
	if body["success"] != false {
		t.Errorf("Expected success=false, got %v", body["success"])
	}
	if body["message"] != "Custom forbidden access" {
		t.Errorf("Expected message 'Custom forbidden access', got %v", body["message"])
	}
}

func TestNotFoundHandler(t *testing.T) {
	r := gin.New()
	r.NoRoute(NotFound())

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/non-existent-route", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}
	if body["success"] != false {
		t.Errorf("Expected success=false, got %v", body["success"])
	}
}
