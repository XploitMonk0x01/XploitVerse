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

	MongoURI string

	JWT JWTConfig

	ClientURL string

	AWS  AWSConfig
	AI   AIConfig
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
	SecretAccessKey  string
	Region          string
}

// AIConfig holds AI API keys configuration (Phase 2+).
type AIConfig struct {
	OpenAIKey    string
	AnthropicKey string
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

	return &Config{
		Port:     getEnv("PORT", "5000"),
		NodeEnv:  getEnv("NODE_ENV", "development"),
		MongoURI: getEnv("MONGODB_URI", "mongodb://localhost:27017/xploitverse"),
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", "default-secret-change-me"),
			ExpiresIn:       getEnv("JWT_EXPIRES_IN", "7d"),
			CookieExpiresIn: getEnvInt("JWT_COOKIE_EXPIRES_IN", 7),
		},
		ClientURL: getEnv("CLIENT_URL", "http://localhost:5173"),
		AWS: AWSConfig{
			AccessKeyID:    getEnv("AWS_ACCESS_KEY_ID", ""),
			SecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
			Region:         getEnv("AWS_REGION", "us-east-1"),
		},
		AI: AIConfig{
			OpenAIKey:    getEnv("OPENAI_API_KEY", ""),
			AnthropicKey: getEnv("ANTHROPIC_API_KEY", ""),
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
