package pgapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestHashSHA256(t *testing.T) {
	// Standard test vector: sha256 of empty string or known string
	h1 := hashSHA256("XPLOIT{test_flag}")
	h2 := hashSHA256("XPLOIT{test_flag}")
	h3 := hashSHA256("XPLOIT{different_flag}")

	if h1 != h2 {
		t.Errorf("hashSHA256 must be deterministic: %s != %s", h1, h2)
	}
	if h1 == h3 {
		t.Errorf("Different inputs should produce different hashes")
	}
	if len(h1) != 64 {
		t.Errorf("SHA256 hex digest should be 64 chars, got %d", len(h1))
	}
}

func TestParseJSONStringArray(t *testing.T) {
	valid := []byte(`["linux", "network", "web"]`)
	arr := parseJSONStringArray(valid)
	if len(arr) != 3 || arr[0] != "linux" || arr[1] != "network" || arr[2] != "web" {
		t.Errorf("Failed to parse valid string array: %v", arr)
	}

	empty := []byte(``)
	arrEmpty := parseJSONStringArray(empty)
	if len(arrEmpty) != 0 {
		t.Errorf("Expected empty slice for empty bytes, got %v", arrEmpty)
	}

	corrupt := []byte(`not json`)
	arrCorrupt := parseJSONStringArray(corrupt)
	if len(arrCorrupt) != 0 {
		t.Errorf("Expected empty slice for corrupt bytes, got %v", arrCorrupt)
	}
}

func TestParseInt64Param(t *testing.T) {
	r := gin.New()
	var parsedID int64
	var ok bool

	r.GET("/tasks/:id", func(c *gin.Context) {
		parsedID, ok = parseInt64Param(c, "id")
		if ok {
			c.JSON(http.StatusOK, gin.H{"id": parsedID})
		}
	})

	// Valid ID
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/tasks/42", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK || parsedID != 42 || !ok {
		t.Errorf("Expected 42, got %d, code %d", parsedID, w.Code)
	}

	// Invalid ID (alphabetic string)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/tasks/invalid", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request for non-numeric ID, got %d", w.Code)
	}

	// Negative ID
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/tasks/-5", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request for negative ID, got %d", w.Code)
	}
}

func TestWriteErrEnvelope(t *testing.T) {
	r := gin.New()
	r.GET("/error", func(c *gin.Context) {
		writeErr(c, http.StatusUnauthorized, "Custom auth failure")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/error", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Expected status 401, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse JSON body: %v", err)
	}
	if body["success"] != false {
		t.Errorf("Expected success=false, got %v", body["success"])
	}
	if body["message"] != "Custom auth failure" {
		t.Errorf("Expected message 'Custom auth failure', got %v", body["message"])
	}
}
