package services

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// labSlugRe matches a safe challenge slug: lowercase letters, digits and dashes.
var labSlugRe = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`)

// ManagedLabMarker is written into every admin-created lab directory so the
// delete handler can distinguish authored labs from built-in challenge sources.
const ManagedLabMarker = ".xploitverse-managed"

// ChallengesDir exposes the resolved challenges/ directory so API handlers can
// materialize newly uploaded labs next to the built-in ones.
func ChallengesDir() string {
	return challengesDir()
}

// SlugifyLabName converts an arbitrary display name into a safe challenge slug.
func SlugifyLabName(name string) string {
	lower := strings.ToLower(strings.TrimSpace(name))

	var b strings.Builder
	prevDash := false
	for _, r := range lower {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevDash = false
		default:
			if !prevDash {
				b.WriteRune('-')
				prevDash = true
			}
		}
	}

	out := strings.Trim(b.String(), "-")
	if len(out) > 64 {
		out = strings.Trim(out[:64], "-")
	}
	return out
}

// ValidateLabSlug reports whether slug is safe to use as a directory name.
func ValidateLabSlug(slug string) error {
	if !labSlugRe.MatchString(slug) {
		return fmt.Errorf("invalid lab slug %q: use lowercase letters, digits and dashes", slug)
	}
	return nil
}

// SafeRelPath normalizes a relative upload path and rejects traversal attempts.
func SafeRelPath(rel string) (string, error) {
	rel = strings.TrimSpace(strings.ReplaceAll(rel, "\\", "/"))
	rel = strings.TrimPrefix(rel, "./")
	if rel == "" {
		return "", fmt.Errorf("empty file path")
	}
	if strings.HasPrefix(rel, "/") {
		return "", fmt.Errorf("absolute paths are not allowed: %s", rel)
	}

	parts := strings.Split(rel, "/")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		switch part {
		case "", ".":
			continue
		case "..":
			return "", fmt.Errorf("path traversal is not allowed: %s", rel)
		default:
			clean = append(clean, part)
		}
	}
	if len(clean) == 0 {
		return "", fmt.Errorf("invalid file path: %s", rel)
	}
	return strings.Join(clean, "/"), nil
}

// LabSourceDir returns the on-disk directory for a challenge slug.
func LabSourceDir(slug string) string {
	return filepath.Join(challengesDir(), slug)
}

// WriteLabSource materializes the provided files (relative path -> bytes) under
// challenges/<slug>/. Existing files are overwritten; the directory is created
// when missing.
func WriteLabSource(slug string, files map[string][]byte) (string, error) {
	if err := ValidateLabSlug(slug); err != nil {
		return "", err
	}

	root := LabSourceDir(slug)
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", fmt.Errorf("failed to create lab directory: %w", err)
	}

	for rel, content := range files {
		clean, err := SafeRelPath(rel)
		if err != nil {
			return "", err
		}
		dest := filepath.Join(root, filepath.FromSlash(clean))
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return "", fmt.Errorf("failed to create directory for %s: %w", clean, err)
		}
		if err := os.WriteFile(dest, content, 0o644); err != nil {
			return "", fmt.Errorf("failed to write %s: %w", clean, err)
		}
	}

	return root, nil
}

// IsManagedLabSource reports whether the directory for slug was authored through
// the admin panel (and is therefore safe to delete from disk).
func IsManagedLabSource(slug string) bool {
	info, err := os.Stat(filepath.Join(LabSourceDir(slug), ManagedLabMarker))
	return err == nil && !info.IsDir()
}

// RemoveLabSource deletes a challenge source directory. It is best-effort and
// ignores an already-missing directory.
func RemoveLabSource(slug string) error {
	if err := ValidateLabSlug(slug); err != nil {
		return err
	}
	return os.RemoveAll(LabSourceDir(slug))
}
