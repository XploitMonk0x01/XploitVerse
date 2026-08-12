package pgapi

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/services"
)

// Force imports to be recognized as used
var _ *services.RedisService

func (a *API) SubmitTaskFlag(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	taskID, ok := parseInt64Param(c, "task_id")
	if !ok {
		return
	}

	var body struct {
		Flag string `json:"flag" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	a.submitFlagForTask(c, u, taskID, body.Flag)
}

func (a *API) submitFlagForTask(c *gin.Context, u *AuthUser, taskID int64, flag string) {

	if a.RedisSvc != nil && a.RedisSvc.Available() {
		allowed, _, _ := a.RedisSvc.RateLimit(c.Request.Context(), fmt.Sprintf("xv:ratelimit:submit-flag:%d:%d", u.ID, taskID), 5, 60*time.Second)
		if !allowed {
			writeErr(c, http.StatusTooManyRequests, "Too many flag attempts. Please wait before retrying")
			return
		}
	}

	var (
		roomID   int64
		tType    string
		flagType string
		flagHash string
		points   int64
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT room_id, type, flag_type, COALESCE(flag_hash,''), points
		FROM tasks
		WHERE id=$1 AND is_published=true
	`, taskID).Scan(&roomID, &tType, &flagType, &flagHash, &points)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Task not found")
		return
	}
	if strings.TrimSpace(flagHash) == "" {
		writeErr(c, http.StatusBadRequest, "This task has no flag configured")
		return
	}
	if tType != "flag" && strings.TrimSpace(flagType) == "" {
		writeErr(c, http.StatusBadRequest, "This task does not accept flags")
		return
	}

	var (
		attempts     int64
		completedAt  *time.Time
		pointsEarned int64
	)
	err = a.DB.QueryRow(c.Request.Context(), `
		SELECT attempts, completed_at, points_earned
		FROM progress
		WHERE user_id=$1 AND task_id=$2
	`, u.ID, taskID).Scan(&attempts, &completedAt, &pointsEarned)
	if err == nil && completedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Task already completed",
			"data":    gin.H{"taskId": taskID, "pointsEarned": pointsEarned, "alreadySolved": true},
		})
		return
	}

	isCorrect := strings.EqualFold(hashSHA256(flag), strings.TrimSpace(flagHash))
	now := time.Now()
	if isCorrect {
		err = a.DB.QueryRow(c.Request.Context(), `
			INSERT INTO progress (user_id, room_id, task_id, state, started_at, completed_at, attempts, points_earned, created_at, updated_at)
			VALUES ($1, $2, $3, 'completed', $4, $4, 1, $5, $4, $4)
			ON CONFLICT (user_id, task_id) DO UPDATE SET
				state='completed',
				completed_at=COALESCE(progress.completed_at, EXCLUDED.completed_at),
				attempts=progress.attempts+1,
				points_earned=GREATEST(progress.points_earned, EXCLUDED.points_earned),
				updated_at=EXCLUDED.updated_at
			RETURNING attempts, completed_at, points_earned
		`, u.ID, roomID, taskID, now, points).Scan(&attempts, &completedAt, &pointsEarned)
		if err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to update progress")
			return
		}

		if a.RedisSvc != nil && a.RedisSvc.Available() {
			_, _ = a.RedisSvc.IncrementScore(c.Request.Context(), strconv.FormatInt(u.ID, 10), float64(points))
			_, _ = a.RedisSvc.MarkFlagSubmitted(c.Request.Context(), strconv.FormatInt(u.ID, 10), strconv.FormatInt(taskID, 10))
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Correct flag!",
			"data":    gin.H{"taskId": taskID, "pointsEarned": pointsEarned},
		})
		return
	}

	err = a.DB.QueryRow(c.Request.Context(), `
		INSERT INTO progress (user_id, room_id, task_id, state, started_at, attempts, points_earned, created_at, updated_at)
		VALUES ($1, $2, $3, 'in_progress', $4, 1, 0, $4, $4)
		ON CONFLICT (user_id, task_id) DO UPDATE SET
			attempts=progress.attempts+1,
			updated_at=EXCLUDED.updated_at
		RETURNING attempts
	`, u.ID, roomID, taskID, now).Scan(&attempts)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to update progress")
		return
	}

	writeErr(c, http.StatusBadRequest, "Incorrect flag")
}

func (a *API) SubmitFlag(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		TaskID int64  `json:"taskId" binding:"required"`
		Flag   string `json:"flag" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	a.submitFlagForTask(c, u, body.TaskID, body.Flag)
}