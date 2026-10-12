package services

import "testing"

func TestSlugifyLabName(t *testing.T) {
	cases := map[string]string{
		"My SQL Injection Lab": "my-sql-injection-lab",
		"  Web_Basic / v2  ":   "web-basic-v2",
		"UPPER---CASE":         "upper-case",
		"符号 only":              "only",
		"---":                  "",
	}

	for input, want := range cases {
		if got := SlugifyLabName(input); got != want {
			t.Errorf("SlugifyLabName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestValidateLabSlug(t *testing.T) {
	valid := []string{"web-basic", "lab1", "a", "my-sql-injection-lab"}
	for _, s := range valid {
		if err := ValidateLabSlug(s); err != nil {
			t.Errorf("expected %q to be valid: %v", s, err)
		}
	}

	invalid := []string{"", "-leading", "trailing-", "UPPER", "has space", "slash/path", "../escape", "under_score"}
	for _, s := range invalid {
		if err := ValidateLabSlug(s); err == nil {
			t.Errorf("expected %q to be rejected", s)
		}
	}
}

func TestSafeRelPath(t *testing.T) {
	valid := map[string]string{
		"Dockerfile":      "Dockerfile",
		"app/main.go":     "app/main.go",
		"./src/index.js":  "src/index.js",
		"web\\index.html": "web/index.html",
	}
	for input, want := range valid {
		got, err := SafeRelPath(input)
		if err != nil {
			t.Errorf("SafeRelPath(%q) returned error: %v", input, err)
			continue
		}
		if got != want {
			t.Errorf("SafeRelPath(%q) = %q, want %q", input, got, want)
		}
	}

	invalid := []string{"", "   ", "/etc/passwd", "../../etc/passwd", "..", "foo/../../bar", "a/b/../c.txt"}
	for _, input := range invalid {
		if _, err := SafeRelPath(input); err == nil {
			t.Errorf("expected %q to be rejected", input)
		}
	}
}
