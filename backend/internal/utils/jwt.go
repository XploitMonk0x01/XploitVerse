package utils

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/xploitverse/backend/internal/config"
)

// Claims represents the JWT claims.
type Claims struct {
	ID string `json:"id"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for the given user ID.
func GenerateToken(userID string, cfg *config.Config) (string, error) {
	expiry, err := parseExpiry(cfg.JWT.ExpiresIn)
	if err != nil {
		return "", fmt.Errorf("invalid JWT expiry: %w", err)
	}

	claims := Claims{
		ID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWT.Secret))
}

// VerifyToken validates a JWT token string and returns the claims.
func VerifyToken(tokenStr string, cfg *config.Config) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// CookieOptions returns HTTP cookie configuration for JWT tokens.
func CookieOptions(cfg *config.Config) *http.Cookie {
	return &http.Cookie{
		Name:     "jwt",
		Path:     "/",
		MaxAge:   cfg.JWT.CookieExpiresIn * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   cfg.NodeEnv == "production",
		SameSite: func() http.SameSite {
			if cfg.NodeEnv == "production" {
				return http.SameSiteStrictMode
			}
			return http.SameSiteLaxMode
		}(),
	}
}

// CreateTokenResponse generates a token and cookie for the given user ID.
func CreateTokenResponse(userID string, cfg *config.Config) (string, *http.Cookie, error) {
	token, err := GenerateToken(userID, cfg)
	if err != nil {
		return "", nil, err
	}

	cookie := CookieOptions(cfg)
	cookie.Value = token

	return token, cookie, nil
}

// parseExpiry converts a duration string like "7d", "24h", "30m" to time.Duration.
func parseExpiry(s string) (time.Duration, error) {
	if strings.HasSuffix(s, "d") {
		days, err := strconv.Atoi(strings.TrimSuffix(s, "d"))
		if err != nil {
			return 0, err
		}
		return time.Duration(days) * 24 * time.Hour, nil
	}
	return time.ParseDuration(s)
}
