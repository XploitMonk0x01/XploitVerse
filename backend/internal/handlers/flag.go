package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"github.com/xploitverse/backend/internal/services"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// flagAttemptRecord tracks per-user-per-task submission attempts.
type flagAttemptRecord struct {
	count    int
	windowStart time.Time
}

// FlagHandler holds dependencies for flag submission endpoints.
type FlagHandler struct {
	DB       *mongo.Database
	Cfg      *config.Config
	RedisSvc *services.RedisService
	rateMu   sync.Mutex
	rateMap  map[string]*flagAttemptRecord // key: userID+":"+taskID
}

// flagRateKey builds a composite key for per-user-per-task rate limiting.
func flagRateKey(userID, taskID string) string { return userID + ":" + taskID }

// checkFlagRateLimit returns true if the submission should be blocked.
// Allows at most 5 attempts per 60 seconds per user+task.
// Uses Redis sliding window when available, falls back to in-memory.
func (h *FlagHandler) checkFlagRateLimit(ctx context.Context, userID, taskID string) bool {
	const maxAttempts = 5
	const window = 60 * time.Second

	// Try Redis first
	if h.RedisSvc != nil && h.RedisSvc.Available() {
		key := fmt.Sprintf("xv:ratelimit:flag:%s:%s", userID, taskID)
		allowed, _, _ := h.RedisSvc.RateLimit(ctx, key, maxAttempts, window)
		return !allowed
	}

	// Fallback: in-memory rate limiting
	key := flagRateKey(userID, taskID)
	now := time.Now()

	h.rateMu.Lock()
	defer h.rateMu.Unlock()

	if h.rateMap == nil {
		h.rateMap = make(map[string]*flagAttemptRecord)
	}

	rec, ok := h.rateMap[key]
	if !ok || now.Sub(rec.windowStart) > window {
		h.rateMap[key] = &flagAttemptRecord{count: 1, windowStart: now}
		return false // allowed
	}
	rec.count++
	return rec.count > maxAttempts
}

func sha256Hex(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

// SubmitFlag handles POST /api/flags/submit.
func (h *FlagHandler) SubmitFlag(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		TaskID string `json:"taskId" binding:"required"`
		Flag   string `json:"flag" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Per-user-per-task anti-cheat: max 5 attempts/minute
	if h.checkFlagRateLimit(c.Request.Context(), user.ID.Hex(), body.TaskID) {
		middleware.AbortWithError(c, http.StatusTooManyRequests, "Too many flag attempts. Please wait a minute before trying again.")
		return
	}

	taskObjID, err := bson.ObjectIDFromHex(body.TaskID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	tasksCol := h.DB.Collection("tasks")
	var task models.Task
	if err := tasksCol.FindOne(c.Request.Context(), bson.M{"_id": taskObjID, "isPublished": true}).Decode(&task); err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Task not found")
		return
	}

	if task.Type != models.TaskTypeFlag {
		middleware.AbortWithError(c, http.StatusBadRequest, "This task does not accept flags")
		return
	}
	if strings.TrimSpace(task.FlagHash) == "" {
		middleware.AbortWithError(c, http.StatusBadRequest, "This task has no flag configured")
		return
	}

	progressCol := h.DB.Collection("user_task_progress")
	filter := bson.M{"userId": user.ID, "taskId": task.ID}

	var existing models.UserTaskProgress
	err = progressCol.FindOne(c.Request.Context(), filter).Decode(&existing)
	if err == nil && existing.CompletedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Task already completed",
			"data": gin.H{
				"taskId":        task.ID.Hex(),
				"completedAt":   existing.CompletedAt,
				"pointsEarned":  existing.PointsEarned,
				"alreadySolved": true,
			},
		})
		return
	}

	now := time.Now()
	attempts := 1
	if err == nil {
		attempts = existing.Attempts + 1
	}

	submitted := strings.TrimSpace(body.Flag)
	submittedHash := sha256Hex(submitted)
	expectedHash := strings.ToLower(strings.TrimSpace(task.FlagHash))
	isCorrect := strings.ToLower(submittedHash) == expectedHash

	set := bson.M{"updatedAt": now}
	if isCorrect {
		set["completedAt"] = now
		set["pointsEarned"] = task.Points
	}

	update := bson.M{
		"$setOnInsert": bson.M{
			"createdAt": now,
			"userId":    user.ID,
			"taskId":    task.ID,
			"attempts":  0,
		},
		"$set": set,
		"$inc": bson.M{"attempts": 1},
	}

	_, _ = progressCol.UpdateOne(c.Request.Context(), filter, update, options.UpdateOne().SetUpsert(true))

	if !isCorrect {
		middleware.AbortWithError(c, http.StatusBadRequest, "Incorrect flag")
		return
	}

	// Update Redis leaderboard score on correct submission
	if h.RedisSvc != nil && h.RedisSvc.Available() {
		_, _ = h.RedisSvc.IncrementScore(c.Request.Context(), user.ID.Hex(), float64(task.Points))
		// Mark as submitted for fast dedup
		_, _ = h.RedisSvc.MarkFlagSubmitted(c.Request.Context(), user.ID.Hex(), body.TaskID)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Correct flag!",
		"data": gin.H{
			"taskId":       task.ID.Hex(),
			"attempts":     attempts,
			"pointsEarned": task.Points,
		},
	})
}
