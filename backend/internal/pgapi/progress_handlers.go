package pgapi

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (a *API) GetMyProgress(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT task_id, state, started_at, completed_at, attempts, points_earned
		FROM progress
		WHERE user_id=$1
		ORDER BY updated_at DESC
	`, u.ID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch progress")
		return
	}
	defer rows.Close()

	progress := make([]gin.H, 0)
	var completedCount int64
	var totalPoints int64
	for rows.Next() {
		var taskID int64
		var state string
		var startedAt time.Time
		var completedAt *time.Time
		var attempts, pointsEarned int64
		if err := rows.Scan(&taskID, &state, &startedAt, &completedAt, &attempts, &pointsEarned); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode progress")
			return
		}
		if completedAt != nil {
			completedCount++
		}
		totalPoints += pointsEarned
		progress = append(progress, gin.H{
			"taskId":       strconv.FormatInt(taskID, 10),
			"state":        state,
			"startedAt":    startedAt,
			"completedAt":  completedAt,
			"attempts":     attempts,
			"pointsEarned": pointsEarned,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"progress": progress,
			"summary": gin.H{
				"completedTasks": completedCount,
				"totalPoints":    totalPoints,
			},
		},
	})
}