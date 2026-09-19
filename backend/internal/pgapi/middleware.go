package pgapi

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/utils"
)

const authUserKey = "pg_auth_user"

func authError(c *gin.Context, code int, message string) {
	c.AbortWithStatusJSON(code, gin.H{
		"success": false,
		"message": message,
	})
}

// VerifyToken validates JWT and loads a PostgreSQL-backed user.
func VerifyToken(cfg *config.Config, db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := ""

		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
		if tokenStr == "" {
			if cookie, err := c.Cookie("jwt"); err == nil {
				tokenStr = cookie
			}
		}
		if tokenStr == "" {
			authError(c, http.StatusUnauthorized, "Access denied. No token provided.")
			return
		}

		claims, err := utils.VerifyToken(tokenStr, cfg)
		if err != nil {
			authError(c, http.StatusUnauthorized, "Invalid or expired token.")
			return
		}

		userID, err := strconv.ParseInt(claims.ID, 10, 64)
		if err != nil || userID <= 0 {
			authError(c, http.StatusUnauthorized, "Invalid token subject.")
			return
		}

		row := db.QueryRow(c.Request.Context(), `
			SELECT id, username, email, role, first_name, last_name, is_active,
				password_changed_at, total_lab_time, total_spent
			FROM users
			WHERE id = $1
		`, userID)

		var u AuthUser
		if err := row.Scan(
			&u.ID,
			&u.Username,
			&u.Email,
			&u.Role,
			&u.FirstName,
			&u.LastName,
			&u.IsActive,
			&u.PasswordChangedAt,
			&u.TotalLabTime,
			&u.TotalSpent,
		); err != nil {
			authError(c, http.StatusUnauthorized, "User no longer exists.")
			return
		}

		if !u.IsActive {
			authError(c, http.StatusUnauthorized, "User account has been deactivated.")
			return
		}

		if claims.IssuedAt != nil && u.PasswordChangedAt != nil && u.PasswordChangedAt.Unix() > claims.IssuedAt.Unix() {
			authError(c, http.StatusUnauthorized, "Password recently changed. Please log in again.")
			return
		}

		c.Set(authUserKey, &u)
		c.Next()
	}
}

func getAuthUser(c *gin.Context) *AuthUser {
	v, ok := c.Get(authUserKey)
	if !ok {
		return nil
	}
	u, ok := v.(*AuthUser)
	if !ok {
		return nil
	}
	return u
}

func requireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		u := getAuthUser(c)
		if u == nil {
			authError(c, http.StatusUnauthorized, "Authentication required.")
			return
		}

		for _, r := range roles {
			if u.Role == r {
				c.Next()
				return
			}
		}

		authError(c, http.StatusForbidden, "Insufficient role.")
	}
}
