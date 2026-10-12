package pgapi

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminOverview returns live platform telemetry for the admin command center:
// user counts, lab catalog size, session activity, progress, and revenue. All
// values are computed from PostgreSQL (plus Docker/Redis health probes) — no
// static data.
func (a *API) AdminOverview(c *gin.Context) {
	ctx := c.Request.Context()

	stats := gin.H{}
	var (
		totalUsers  int64
		students    int64
		instructors int64
		admins      int64
		activeUsers int64
	)
	if err := a.DB.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE role = 'STUDENT'),
			COUNT(*) FILTER (WHERE role = 'INSTRUCTOR'),
			COUNT(*) FILTER (WHERE role = 'ADMIN'),
			COUNT(*) FILTER (WHERE is_active)
		FROM users
	`).Scan(&totalUsers, &students, &instructors, &admins, &activeUsers); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load user metrics")
		return
	}
	stats["totalUsers"] = totalUsers
	stats["students"] = students
	stats["instructors"] = instructors
	stats["admins"] = admins
	stats["activeUsers"] = activeUsers

	var (
		activeLabs int64
		totalLabs  int64
		totalRooms int64
		totalTasks int64
	)
	if err := a.DB.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM assets WHERE is_active),
			(SELECT COUNT(*) FROM assets),
			(SELECT COUNT(*) FROM rooms),
			(SELECT COUNT(*) FROM tasks WHERE is_published)
	`).Scan(&activeLabs, &totalLabs, &totalRooms, &totalTasks); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load catalog metrics")
		return
	}
	stats["totalLabs"] = totalLabs
	stats["activeLabs"] = activeLabs
	stats["totalRooms"] = totalRooms
	stats["totalTasks"] = totalTasks

	var (
		activeSessions   int64
		totalSessions    int64
		sessionsLast24h  int64
		activeContainers int64
	)
	if err := a.DB.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status IN ('pending','initializing','running')),
			COUNT(*),
			COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours'),
			COUNT(*) FILTER (WHERE status IN ('pending','initializing','running') AND COALESCE(target_container_id,'') <> '')
		FROM lab_sessions
	`).Scan(&activeSessions, &totalSessions, &sessionsLast24h, &activeContainers); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load session metrics")
		return
	}
	stats["activeSessions"] = activeSessions
	stats["totalSessions"] = totalSessions
	stats["sessionsLast24h"] = sessionsLast24h
	stats["activeContainers"] = activeContainers

	var (
		solvedTasks int64
		totalPoints int64
	)
	if err := a.DB.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE completed_at IS NOT NULL),
			COALESCE(SUM(points_earned), 0)
		FROM progress
	`).Scan(&solvedTasks, &totalPoints); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load progress metrics")
		return
	}
	stats["solvedTasks"] = solvedTasks
	stats["totalPoints"] = totalPoints

	var (
		paidOrders   int64
		revenuePaise int64
	)
	// lab_payments is created by ensureBillingSchema; tolerate a missing table.
	if err := a.DB.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(amount_paise), 0)
		FROM lab_payments WHERE status = 'paid'
	`).Scan(&paidOrders, &revenuePaise); err == nil {
		stats["paidOrders"] = paidOrders
		stats["revenueInr"] = float64(revenuePaise) / 100.0
	} else {
		stats["paidOrders"] = int64(0)
		stats["revenueInr"] = float64(0)
	}

	// ── System health ────────────────────────────────────────────────────────
	postgresOk := a.DB.Ping(ctx) == nil
	dockerOk := a.DockerSvc != nil && a.DockerSvc.Available()
	redisOk := a.RedisSvc != nil && a.RedisSvc.Available()

	// ── Recent operatives ────────────────────────────────────────────────────
	recentUsers, err := a.recentUsers(ctx)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load recent users")
		return
	}

	// ── Top operatives ───────────────────────────────────────────────────────
	topUsers, err := a.topUsers(ctx)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load leaderboard")
		return
	}

	// ── Recent sessions ──────────────────────────────────────────────────────
	recentSessions, err := a.recentSessions(ctx)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to load recent sessions")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats": stats,
			"system": gin.H{
				"dockerAvailable":  dockerOk,
				"postgresOk":       postgresOk,
				"redisAvailable":   redisOk,
				"activeContainers": activeContainers,
			},
			"recentUsers":    recentUsers,
			"topUsers":       topUsers,
			"recentSessions": recentSessions,
		},
	})
}

func (a *API) recentUsers(ctx context.Context) ([]gin.H, error) {
	rows, err := a.DB.Query(ctx, `
		SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
			COALESCE(SUM(p.points_earned), 0) AS points,
			COUNT(p.id) FILTER (WHERE p.completed_at IS NOT NULL) AS solved
		FROM users u
		LEFT JOIN progress p ON p.user_id = u.id
		GROUP BY u.id
		ORDER BY u.created_at DESC, u.id DESC
		LIMIT 8
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]gin.H, 0)
	for rows.Next() {
		var (
			id        int64
			username  string
			email     string
			role      string
			isActive  bool
			createdAt any
			points    int64
			solved    int64
		)
		if err := rows.Scan(&id, &username, &email, &role, &isActive, &createdAt, &points, &solved); err != nil {
			return nil, err
		}
		out = append(out, gin.H{
			"id":        id,
			"username":  username,
			"email":     email,
			"role":      role,
			"isActive":  isActive,
			"createdAt": createdAt,
			"points":    points,
			"solved":    solved,
		})
	}
	return out, rows.Err()
}

func (a *API) topUsers(ctx context.Context) ([]gin.H, error) {
	rows, err := a.DB.Query(ctx, `
		SELECT u.username, COALESCE(SUM(p.points_earned), 0) AS points,
			COUNT(p.id) FILTER (WHERE p.completed_at IS NOT NULL) AS solved
		FROM users u
		LEFT JOIN progress p ON p.user_id = u.id
		GROUP BY u.id, u.username
		ORDER BY points DESC, u.id ASC
		LIMIT 5
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]gin.H, 0)
	rank := 0
	for rows.Next() {
		var (
			username string
			points   int64
			solved   int64
		)
		if err := rows.Scan(&username, &points, &solved); err != nil {
			return nil, err
		}
		rank++
		out = append(out, gin.H{
			"rank":     rank,
			"username": username,
			"points":   points,
			"solved":   solved,
		})
	}
	return out, rows.Err()
}

func (a *API) recentSessions(ctx context.Context) ([]gin.H, error) {
	rows, err := a.DB.Query(ctx, `
		SELECT s.id, COALESCE(u.username, '—'), s.status,
			s.started_at, s.expires_at, s.created_at
		FROM lab_sessions s
		LEFT JOIN users u ON u.id = s.user_id
		ORDER BY s.created_at DESC
		LIMIT 6
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]gin.H, 0)
	for rows.Next() {
		var (
			id        int64
			username  string
			status    string
			startedAt any
			expiresAt any
			createdAt any
		)
		if err := rows.Scan(&id, &username, &status, &startedAt, &expiresAt, &createdAt); err != nil {
			return nil, err
		}
		out = append(out, gin.H{
			"id":        id,
			"username":  username,
			"status":    status,
			"startedAt": startedAt,
			"expiresAt": expiresAt,
			"createdAt": createdAt,
		})
	}
	return out, rows.Err()
}
