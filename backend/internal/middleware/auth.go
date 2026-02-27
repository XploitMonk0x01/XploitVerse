package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/models"
	"github.com/xploitverse/backend/internal/utils"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// VerifyToken extracts and validates the JWT from the request.
func VerifyToken(cfg *config.Config, db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		// Check Authorization header first (Bearer token)
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Fallback to cookie
		if tokenStr == "" {
			if cookie, err := c.Cookie("jwt"); err == nil {
				tokenStr = cookie
			}
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Access denied. No token provided.",
			})
			return
		}

		// Verify token
		claims, err := utils.VerifyToken(tokenStr, cfg)
		if err != nil {
			msg := "Authentication failed."
			if strings.Contains(err.Error(), "expired") {
				msg = "Token expired. Please log in again."
			} else if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "signature") {
				msg = "Invalid token."
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": msg,
			})
			return
		}

		// Check if user still exists
		objID, err := bson.ObjectIDFromHex(claims.ID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Invalid token.",
			})
			return
		}

		var user models.User
		err = db.Collection("users").FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&user)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User no longer exists.",
			})
			return
		}

		if !user.IsActive {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User account has been deactivated.",
			})
			return
		}

		// Check if user changed password after token was issued
		if claims.IssuedAt != nil && user.ChangedPasswordAfter(claims.IssuedAt.Unix()) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Password recently changed. Please log in again.",
			})
			return
		}

		// Attach user to context
		c.Set("user", &user)
		c.Set("userId", user.ID)
		c.Next()
	}
}

// CheckRole creates middleware that checks if the user has one of the allowed roles.
func CheckRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "Authentication required.",
			})
			return
		}
		user := userVal.(*models.User)

		allowed := false
		for _, r := range roles {
			if user.Role == r {
				allowed = true
				break
			}
		}

		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Access denied. Required role: " + strings.Join(roles, " or ") + ". Your role: " + user.Role,
			})
			return
		}

		c.Next()
	}
}

// IsAdmin is a convenience middleware that restricts access to admins.
func IsAdmin() gin.HandlerFunc {
	return CheckRole(models.RoleAdmin)
}

// IsInstructor is a convenience middleware for admin or instructor access.
func IsInstructor() gin.HandlerFunc {
	return CheckRole(models.RoleAdmin, models.RoleInstructor)
}

// OptionalAuth attaches the user to the context if a valid token exists, but doesn't require it.
func OptionalAuth(cfg *config.Config, db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string

		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
		if tokenStr == "" {
			if cookie, err := c.Cookie("jwt"); err == nil {
				tokenStr = cookie
			}
		}

		if tokenStr != "" {
			claims, err := utils.VerifyToken(tokenStr, cfg)
			if err == nil {
				objID, err := bson.ObjectIDFromHex(claims.ID)
				if err == nil {
					var user models.User
					if err := db.Collection("users").FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&user); err == nil {
						if user.IsActive {
							c.Set("user", &user)
							c.Set("userId", user.ID)
						}
					}
				}
			}
		}

		c.Next()
	}
}

// GetUser extracts the authenticated user from the Gin context.
func GetUser(c *gin.Context) *models.User {
	userVal, exists := c.Get("user")
	if !exists {
		return nil
	}
	return userVal.(*models.User)
}
