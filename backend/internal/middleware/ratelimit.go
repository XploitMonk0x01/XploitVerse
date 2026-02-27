package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// visitor tracks request count and last seen time per IP.
type visitor struct {
	count    int
	lastSeen time.Time
}

// RateLimiter implements a simple per-IP rate limiter.
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.Mutex
	max      int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter.
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		max:      max,
		window:   window,
	}

	// Cleanup expired entries every minute
	go func() {
		for {
			time.Sleep(time.Minute)
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > rl.window {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

// Middleware returns a Gin middleware that rate limits requests per IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		if !exists || time.Since(v.lastSeen) > rl.window {
			rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
			rl.mu.Unlock()
			c.Next()
			return
		}

		v.count++
		v.lastSeen = time.Now()

		if v.count > rl.max {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Too many requests, please try again later.",
			})
			return
		}
		rl.mu.Unlock()

		c.Next()
	}
}
