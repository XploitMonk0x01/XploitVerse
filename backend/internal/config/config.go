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

// LabConfig holds lab-related configuration.
type LabConfig struct {
	HourlyRate           float64
	MaxSessionDuration   int // hours
	AutoTerminateWarning int // minutes before auto-terminate
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
			HourlyRate:           0.5,
			MaxSessionDuration:   4,
			AutoTerminateWarning: 15,
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", ""),
			Port:     getEnv("SMTP_PORT", "587"),
			Username: getEnv("SMTP_USERNAME", ""),
			Password: getEnv("SMTP_PASSWORD", ""),
			From:     getEnv("SMTP_FROM", ""),
			FromName: getEnv("SMTP_FROM_NAME", "XploitVerse"),
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
