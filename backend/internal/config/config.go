package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration.
type Config struct {
	Port    string
	NodeEnv string

	PostgresURI string
	RedisURL    string

	JWT JWTConfig

	ClientURL string

	AWS  AWSConfig
	Lab  LabConfig
	SMTP SMTPConfig

	Razorpay RazorpayConfig
}

// RazorpayConfig holds payment-provider credentials for per-lab usage billing.
type RazorpayConfig struct {
	KeyID         string
	KeySecret     string
	WebhookSecret string
}

// JWTConfig holds JWT-related configuration.
type JWTConfig struct {
	Secret          string
	ExpiresIn       string
	CookieExpiresIn int
}

// AWSConfig holds AWS-related configuration (Phase 2+).
type AWSConfig struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
}

// LabConfig holds lab billing and lifecycle configuration.
//
// Pricing is derived from AWS run cost (see docs/PRICING.md): a lab container
// requests 0.5 vCPU / 512 MB, which packs ~4 containers onto a t3.medium
// (~$0.0416/hr on-demand) plus EBS and NAT/ALB overhead, landing near
// $0.022/lab-hour (~₹2). HourlyRateINR applies a ~4.5x margin so the free
// 59-minute tier and idle capacity stay funded.
type LabConfig struct {
	FreeSessionMinutes int     // free tier length before payment is required
	HourlyRateINR      float64 // base pay-as-you-go rate per lab hour
	MaxSessionMinutes  int     // hard cap on total lifetime of one session
	WarningMinutes     int     // minutes before expiry when the UI warns the user
}

// SMTPConfig holds email SMTP configuration.
type SMTPConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
}

// Load reads configuration from environment variables.
func Load() *Config {
	// Try to load .env file (ignore error if file doesn't exist)
	_ = godotenv.Load()

	cfg := &Config{
		Port:        getEnv("PORT", "5000"),
		NodeEnv:     getEnv("NODE_ENV", "development"),
		PostgresURI: getEnv("POSTGRES_URI", "postgres://postgres:postgres@localhost:5432/xploitverse?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", ""),
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", ""),
			ExpiresIn:       getEnv("JWT_EXPIRES_IN", "7d"),
			CookieExpiresIn: getEnvInt("JWT_COOKIE_EXPIRES_IN", 7),
		},
		ClientURL: getEnv("CLIENT_URL", "http://localhost:5173"),
		AWS: AWSConfig{
			AccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
			SecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
			Region:          getEnv("AWS_REGION", "us-east-1"),
		},
		Lab: LabConfig{
			FreeSessionMinutes: getEnvInt("LAB_FREE_MINUTES", 59),
			HourlyRateINR:      getEnvFloat("LAB_HOURLY_RATE_INR", 9.0),
			MaxSessionMinutes:  getEnvInt("LAB_MAX_SESSION_MINUTES", 480),
			WarningMinutes:     getEnvInt("LAB_WARN_MINUTES", 10),
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", ""),
			Port:     getEnv("SMTP_PORT", "587"),
			Username: getEnv("SMTP_USERNAME", ""),
			Password: getEnv("SMTP_PASSWORD", ""),
			From:     getEnv("SMTP_FROM", ""),
			FromName: getEnv("SMTP_FROM_NAME", "XploitVerse"),
		},
		Razorpay: RazorpayConfig{
			KeyID:         getEnv("RAZORPAY_KEY_ID", ""),
			KeySecret:     getEnv("RAZORPAY_KEY_SECRET", ""),
			WebhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET", ""),
		},
	}

	if cfg.JWT.Secret == "" || cfg.JWT.Secret == "default-secret-change-me" {
		log.Fatal("JWT_SECRET must be set to a secure value (generate with: openssl rand -base64 32)")
	}
	if cfg.PostgresURI == "" {
		log.Fatal("POSTGRES_URI must be set")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
		log.Printf("Warning: invalid integer for %s, using default %d", key, fallback)
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
		log.Printf("Warning: invalid number for %s, using default %v", key, fallback)
	}
	return fallback
}
