package pgapi

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNormalizeLabDifficulty(t *testing.T) {
	cases := map[string]string{
		"easy":   "Easy",
		"MEDIUM": "Medium",
		" hard ": "Hard",
		"":       "Easy",
		"weird":  "Easy",
	}
	for in, want := range cases {
		if got := normalizeLabDifficulty(in); got != want {
			t.Errorf("normalizeLabDifficulty(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestNormalizeLabPorts(t *testing.T) {
	got := normalizeLabPorts([]string{"80", "22/tcp", "80/tcp", "bad", ""})
	want := []string{"80/tcp", "22/tcp"}
	if len(got) != len(want) {
		t.Fatalf("normalizeLabPorts returned %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("normalizeLabPorts returned %v, want %v", got, want)
		}
	}

	fallback := normalizeLabPorts(nil)
	if len(fallback) != 2 || fallback[0] != "22/tcp" || fallback[1] != "5000/tcp" {
		t.Errorf("expected default ports, got %v", fallback)
	}
}

func TestParseJSONLab(t *testing.T) {
	raw := []byte(`{
		"metadata": {"title": "My Lab", "difficulty": "hard", "ports": ["80"]},
		"dockerfile": "FROM alpine:3.19",
		"files": {"app/main.py": "print(1)", "index.html": "<h1>hi</h1>"}
	}`)

	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("failed to build envelope: %v", err)
	}

	req, err := parseJSONLab(envelope)
	if err != nil {
		t.Fatalf("parseJSONLab returned error: %v", err)
	}
	if req.meta.Title != "My Lab" {
		t.Errorf("title = %q, want My Lab", req.meta.Title)
	}
	if req.dockerfile != "FROM alpine:3.19" {
		t.Errorf("dockerfile = %q", req.dockerfile)
	}
	if len(req.files) != 2 {
		t.Fatalf("expected 2 files, got %d", len(req.files))
	}
	if string(req.files["app/main.py"]) != "print(1)" {
		t.Errorf("unexpected file content: %q", req.files["app/main.py"])
	}
}

func TestParseJSONLabFlatMetadata(t *testing.T) {
	raw := []byte(`{"title": "Flat Lab", "dockerfile": "FROM busybox"}`)
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("failed to build envelope: %v", err)
	}
	req, err := parseJSONLab(envelope)
	if err != nil {
		t.Fatalf("parseJSONLab returned error: %v", err)
	}
	if req.meta.Title != "Flat Lab" {
		t.Errorf("flat title = %q, want Flat Lab", req.meta.Title)
	}
}

func TestParseJSONLabRejectsTraversal(t *testing.T) {
	raw := []byte(`{"title": "evil", "files": {"../../etc/passwd": "x"}}`)
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("failed to build envelope: %v", err)
	}
	if _, err := parseJSONLab(envelope); err == nil {
		t.Fatal("expected traversal path to be rejected")
	}
}

func TestParseMultipartLab(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	metadata := `{"title":"Uploaded Lab","difficulty":"Medium","ports":["8080"]}`
	if err := writer.WriteField("metadata", metadata); err != nil {
		t.Fatal(err)
	}
	if err := writer.WriteField("dockerfile", "FROM nginx:alpine\nEXPOSE 8080\n"); err != nil {
		t.Fatal(err)
	}
	// Browsers strip directories from the form filename; relative paths arrive
	// separately via the parallel `paths` field.
	if err := writer.WriteField("paths", `["web/index.html"]`); err != nil {
		t.Fatal(err)
	}

	filePart, err := writer.CreateFormFile("files", "index.html")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := filePart.Write([]byte("<h1>lab</h1>")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	c := newTestContext(body.Bytes(), writer.FormDataContentType())
	req, err := parseMultipartLab(c)
	if err != nil {
		t.Fatalf("parseMultipartLab returned error: %v", err)
	}
	if req.meta.Title != "Uploaded Lab" {
		t.Errorf("title = %q", req.meta.Title)
	}
	if req.meta.Difficulty != "Medium" {
		t.Errorf("difficulty = %q", req.meta.Difficulty)
	}
	if req.dockerfile == "" {
		t.Error("expected dockerfile content")
	}
	if string(req.files["web/index.html"]) != "<h1>lab</h1>" {
		t.Errorf("unexpected file content: %q", req.files["web/index.html"])
	}
}

func TestParseMultipartLabRejectsTraversal(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("paths", `["../../etc/passwd"]`); err != nil {
		t.Fatal(err)
	}
	filePart, err := writer.CreateFormFile("files", "passwd")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = filePart.Write([]byte("x"))
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	c := newTestContext(body.Bytes(), writer.FormDataContentType())
	if _, err := parseMultipartLab(c); err == nil {
		t.Fatal("expected traversal filename to be rejected")
	}
}

func newTestContext(body []byte, contentType string) *gin.Context {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/labs", bytes.NewReader(body))
	req.Header.Set("Content-Type", contentType)
	c.Request = req
	return c
}
