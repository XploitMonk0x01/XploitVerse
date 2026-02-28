package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisService provides Redis-backed caching, rate limiting and leaderboard
// functionality. If Redis is unavailable it degrades gracefully — callers get
// empty values and operations become no-ops.
type RedisService struct {
	client    *redis.Client
	available bool
}

// NewRedisService creates a new Redis client and pings the server. If the
// connection fails the service enters a pass-through mode (available=false).
func NewRedisService(redisURL string) *RedisService {
	if redisURL == "" {
		log.Println("⚠️  REDIS_URL not set — Redis features disabled")
		return &RedisService{available: false}
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("⚠️  Invalid REDIS_URL (%v) — Redis features disabled", err)
		return &RedisService{available: false}
	}
	opts.PoolSize = 20
	opts.MinIdleConns = 5
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 3 * time.Second
	opts.WriteTimeout = 3 * time.Second

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis unreachable (%v) — Redis features disabled", err)
		return &RedisService{client: client, available: false}
	}

	log.Println("✅ Redis connected")
	return &RedisService{client: client, available: true}
}

// Available reports whether Redis is reachable.
func (r *RedisService) Available() bool {
	return r.available
}

// Client returns the underlying redis.Client (may be nil).
func (r *RedisService) Client() *redis.Client {
	return r.client
}

// Close gracefully shuts down the Redis connection pool.
func (r *RedisService) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}

// ──────────────────────────────────────────────────────────────────
//  Generic Cache
// ──────────────────────────────────────────────────────────────────

// Set stores a JSON-serialisable value with an expiration.
func (r *RedisService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if !r.available {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("redis set marshal: %w", err)
	}
	return r.client.Set(ctx, key, data, ttl).Err()
}

// Get retrieves a cached value and unmarshals it into dest.
// Returns false when the key doesn't exist (cache miss).
func (r *RedisService) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
	if !r.available {
		return false, nil
	}
	data, err := r.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(data, dest); err != nil {
		return false, fmt.Errorf("redis get unmarshal: %w", err)
	}
	return true, nil
}

// Delete removes one or more keys.
func (r *RedisService) Delete(ctx context.Context, keys ...string) error {
	if !r.available {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// ──────────────────────────────────────────────────────────────────
//  Rate Limiting (sliding window counter)
// ──────────────────────────────────────────────────────────────────

// RateLimit checks whether the given key has exceeded maxRequests within
// the window duration. Returns (allowed bool, remaining int, err).
func (r *RedisService) RateLimit(ctx context.Context, key string, maxRequests int, window time.Duration) (bool, int, error) {
	if !r.available {
		// When Redis is down, allow all requests (fail open)
		return true, maxRequests, nil
	}

	now := time.Now().UnixMilli()
	windowMs := window.Milliseconds()
	minScore := float64(now - windowMs)

	pipe := r.client.Pipeline()

	// Remove entries outside the window
	pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%f", minScore))
	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: fmt.Sprintf("%d", now)})
	// Count entries in window
	countCmd := pipe.ZCard(ctx, key)
	// Set expiration on the key
	pipe.Expire(ctx, key, window+time.Second)

	if _, err := pipe.Exec(ctx); err != nil {
		return true, maxRequests, err
	}

	count := int(countCmd.Val())
	remaining := maxRequests - count
	if remaining < 0 {
		remaining = 0
	}
	return count <= maxRequests, remaining, nil
}

// ──────────────────────────────────────────────────────────────────
//  Leaderboard (Redis sorted set)
// ──────────────────────────────────────────────────────────────────

// LeaderboardEntry represents a single entry on the leaderboard.
type LeaderboardEntry struct {
	UserID string  `json:"userId"`
	Score  float64 `json:"score"`
	Rank   int64   `json:"rank"`
}

const leaderboardKey = "xv:leaderboard"

// UpdateScore sets a user's leaderboard score (ZADD).
func (r *RedisService) UpdateScore(ctx context.Context, userID string, score float64) error {
	if !r.available {
		return nil
	}
	return r.client.ZAdd(ctx, leaderboardKey, redis.Z{
		Score:  score,
		Member: userID,
	}).Err()
}

// IncrementScore atomically increases a user's score by delta.
func (r *RedisService) IncrementScore(ctx context.Context, userID string, delta float64) (float64, error) {
	if !r.available {
		return 0, nil
	}
	return r.client.ZIncrBy(ctx, leaderboardKey, delta, userID).Result()
}

// GetTopN returns the top N players (highest scores first).
func (r *RedisService) GetTopN(ctx context.Context, n int64) ([]LeaderboardEntry, error) {
	if !r.available {
		return nil, nil
	}

	members, err := r.client.ZRevRangeWithScores(ctx, leaderboardKey, 0, n-1).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]LeaderboardEntry, len(members))
	for i, m := range members {
		entries[i] = LeaderboardEntry{
			UserID: m.Member.(string),
			Score:  m.Score,
			Rank:   int64(i + 1),
		}
	}
	return entries, nil
}

// GetUserRank returns a user's rank (1-based) and score.
// Returns rank=0 if the user is not on the board.
func (r *RedisService) GetUserRank(ctx context.Context, userID string) (int64, float64, error) {
	if !r.available {
		return 0, 0, nil
	}

	rank, err := r.client.ZRevRank(ctx, leaderboardKey, userID).Result()
	if err == redis.Nil {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, err
	}

	score, err := r.client.ZScore(ctx, leaderboardKey, userID).Result()
	if err != nil {
		return 0, 0, err
	}

	return rank + 1, score, nil // +1 because ZRevRank is 0-based
}

// ──────────────────────────────────────────────────────────────────
//  Session Cache
// ──────────────────────────────────────────────────────────────────

// CacheSession stores session data with a TTL.
func (r *RedisService) CacheSession(ctx context.Context, sessionID string, data interface{}, ttl time.Duration) error {
	key := fmt.Sprintf("xv:session:%s", sessionID)
	return r.Set(ctx, key, data, ttl)
}

// GetCachedSession retrieves session data. Returns false on cache miss.
func (r *RedisService) GetCachedSession(ctx context.Context, sessionID string, dest interface{}) (bool, error) {
	key := fmt.Sprintf("xv:session:%s", sessionID)
	return r.Get(ctx, key, dest)
}

// InvalidateSession removes a cached session.
func (r *RedisService) InvalidateSession(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf("xv:session:%s", sessionID)
	return r.Delete(ctx, key)
}

// ──────────────────────────────────────────────────────────────────
//  Flag Dedup
// ──────────────────────────────────────────────────────────────────

// MarkFlagSubmitted records that a user has submitted a flag for a specific
// task. Returns true if this is the FIRST submission (not a duplicate).
func (r *RedisService) MarkFlagSubmitted(ctx context.Context, userID, taskID string) (bool, error) {
	if !r.available {
		return true, nil // fail open — let MongoDB handle dedup
	}
	key := fmt.Sprintf("xv:flag:%s:%s", userID, taskID)
	// SETNX — set only if not exists, with 24h expiration
	set, err := r.client.SetNX(ctx, key, "1", 24*time.Hour).Result()
	return set, err
}
