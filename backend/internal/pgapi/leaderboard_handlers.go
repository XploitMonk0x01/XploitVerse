package pgapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (a *API) GetLeaderboard(c *gin.Context) {
	type entry struct {
		UserID   int64
		Username string
		Points   int64
	}
	entries := make([]entry, 0)

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT u.id, u.username, COALESCE(SUM(p.points_earned), 0) AS score
		FROM users u
		LEFT JOIN progress p ON p.user_id=u.id
		GROUP BY u.id, u.username
		ORDER BY score DESC, u.id ASC
		LIMIT 100
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch leaderboard")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.Username, &e.Points); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode leaderboard")
			return
		}
		entries = append(entries, e)
	}

	out := make([]gin.H, 0, len(entries))
	for i, e := range entries {
		out = append(out, gin.H{
			"rank":     i + 1,
			"userId":   e.UserID,
			"username": e.Username,
			"points":   e.Points,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"leaderboard": out}})
}

func (a *API) GetMyRank(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var rank int64
	var points int64
	err := a.DB.QueryRow(c.Request.Context(), `
		WITH scores AS (
			SELECT u.id, COALESCE(SUM(p.points_earned), 0) AS score
			FROM users u
			LEFT JOIN progress p ON p.user_id = u.id
			GROUP BY u.id
		), ranked AS (
			SELECT id, score, RANK() OVER (ORDER BY score DESC, id ASC) AS rnk
			FROM scores
		)
		SELECT rnk, score FROM ranked WHERE id=$1
	`, u.ID).Scan(&rank, &points)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch rank")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"rank": rank, "points": points}})
}