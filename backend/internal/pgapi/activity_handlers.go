package pgapi

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// activityWindowDays is the rolling window reported to the profile heatmap.
const activityWindowDays = 365

// GetMyActivity returns per-day activity counts for the authenticated user:
// lab sessions started plus tasks completed. The result is intentionally
// sparse — days without activity are omitted, because even a busy account only
// touches a small fraction of the year, and the client builds the grid itself.
func (a *API) GetMyActivity(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// The lower bound is computed here so the SQL predicates stay sargable:
	// date_trunc() is only ever applied to the projected value, never to a
	// indexed column in WHERE.
	since := time.Now().UTC().Add(-activityWindowDays * 24 * time.Hour)

	rows, err := a.DB.Query(c.Request.Context(), `
		WITH events AS (
			SELECT COALESCE(started_at, created_at) AS ts
			FROM lab_sessions
			WHERE user_id = $1 AND COALESCE(started_at, created_at) >= $2
			UNION ALL
			SELECT completed_at AS ts
			FROM progress
			WHERE user_id = $1 AND completed_at >= $2
		)
		SELECT to_char(date_trunc('day', ts AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
		       count(*)::int AS count
		FROM events
		GROUP BY 1
		ORDER BY 1
	`, u.ID, since)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch activity")
		return
	}
	defer rows.Close()

	// make(..., 0) keeps the JSON an empty array rather than null.
	days := make([]gin.H, 0)
	var total int64
	for rows.Next() {
		var day string
		var count int
		if err := rows.Scan(&day, &count); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode activity")
			return
		}
		total += int64(count)
		days = append(days, gin.H{"date": day, "count": count})
	}
	if err := rows.Err(); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to read activity")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"days":  days,
			"total": total,
		},
	})
}
