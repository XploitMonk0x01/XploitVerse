package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"github.com/xploitverse/backend/internal/services"
	"github.com/xploitverse/backend/internal/utils"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// AuthHandler holds dependencies for auth endpoints.
type AuthHandler struct {
	DB           *mongo.Database
	Cfg          *config.Config
	EmailService *services.EmailService
}

// Register handles POST /api/auth/register.
func (h *AuthHandler) Register(c *gin.Context) {
	var body struct {
		Username  string `json:"username" binding:"required,min=3,max=30"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=8"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Role      string `json:"role"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	col := h.DB.Collection("users")

	// Check if user already exists
	var existing models.User
	err := col.FindOne(c.Request.Context(), bson.M{
		"$or": []bson.M{
			{"email": body.Email},
			{"username": body.Username},
		},
	}).Decode(&existing)
	if err == nil {
		field := "email"
		if existing.Username == body.Username {
			field = "username"
		}
		middleware.AbortWithError(c, http.StatusBadRequest, "User with this "+field+" already exists")
		return
	}

	// Determine role
	role := models.RoleStudent
	if h.Cfg.NodeEnv == "development" && body.Role != "" {
		role = body.Role
	}

	now := time.Now()
	user := models.User{
		Username:        body.Username,
		Email:           body.Email,
		Password:        body.Password,
		Role:            role,
		FirstName:       body.FirstName,
		LastName:        body.LastName,
		IsActive:        true,
		IsEmailVerified: false,
		TotalLabTime:    0,
		TotalSpent:      0,
		Preferences:     models.DefaultPreferences(),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := user.HashPassword(); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	result, err := col.InsertOne(c.Request.Context(), user)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	userID := result.InsertedID.(bson.ObjectID).Hex()
	token, cookie, err := utils.CreateTokenResponse(userID, h.Cfg)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Registration successful",
		"data": gin.H{
			"user": gin.H{
				"id":        userID,
				"username":  user.Username,
				"email":     user.Email,
				"role":      user.Role,
				"firstName": user.FirstName,
				"lastName":  user.LastName,
			},
			"token": token,
		},
	})
}

// Login handles POST /api/auth/login.
func (h *AuthHandler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	col := h.DB.Collection("users")
	var user models.User
	err := col.FindOne(c.Request.Context(), bson.M{"email": body.Email}).Decode(&user)
	if err != nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !user.IsActive {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Your account has been deactivated. Please contact support.")
		return
	}

	// We need to fetch the password since it's normally excluded.
	// In this Go implementation we always fetch it, so just compare.
	if !user.ComparePassword(body.Password) {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Update last login
	now := time.Now()
	col.UpdateOne(c.Request.Context(), bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{"lastLogin": now},
	})

	token, cookie, err := utils.CreateTokenResponse(user.ID.Hex(), h.Cfg)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user": gin.H{
				"id":        user.ID.Hex(),
				"username":  user.Username,
				"email":     user.Email,
				"role":      user.Role,
				"firstName": user.FirstName,
				"lastName":  user.LastName,
				"lastLogin": now,
			},
			"token": token,
		},
	})
}

// Logout handles POST /api/auth/logout.
func (h *AuthHandler) Logout(c *gin.Context) {
	cookie := &http.Cookie{
		Name:     "jwt",
		Value:    "loggedout",
		Path:     "/",
		MaxAge:   10,
		HttpOnly: true,
	}
	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logout successful",
	})
}

// GetMe handles GET /api/auth/me.
func (h *AuthHandler) GetMe(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":              user.ID.Hex(),
				"username":        user.Username,
				"email":           user.Email,
				"role":            user.Role,
				"firstName":       user.FirstName,
				"lastName":        user.LastName,
				"fullName":        user.FullName(),
				"isEmailVerified": user.IsEmailVerified,
				"lastLogin":       user.LastLogin,
				"totalLabTime":    user.TotalLabTime,
				"totalSpent":      user.TotalSpent,
				"preferences":     user.Preferences,
				"createdAt":       user.CreatedAt,
			},
		},
	})
}

// UpdatePassword handles PUT /api/auth/update-password.
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	// Fetch user with password
	col := h.DB.Collection("users")
	var fullUser models.User
	err := col.FindOne(c.Request.Context(), bson.M{"_id": user.ID}).Decode(&fullUser)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	if !fullUser.ComparePassword(body.CurrentPassword) {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	fullUser.Password = body.NewPassword
	if err := fullUser.HashPassword(); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	now := time.Now()
	col.UpdateOne(c.Request.Context(), bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"password":          fullUser.Password,
			"passwordChangedAt": now,
			"updatedAt":         now,
		},
	})

	token, cookie, err := utils.CreateTokenResponse(user.ID.Hex(), h.Cfg)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password updated successfully",
		"data":    gin.H{"token": token},
	})
}

// RefreshToken handles POST /api/auth/refresh-token.
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	token, cookie, err := utils.CreateTokenResponse(user.ID.Hex(), h.Cfg)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token refreshed successfully",
		"data":    gin.H{"token": token},
	})
}

// ForgotPassword handles POST /api/auth/forgot-password.
// Generates a password reset token and stores a hashed version in the DB.
// In production, the raw token would be sent via email.
// In development, it's returned in the response for testing.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var body struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Please provide a valid email address")
		return
	}

	col := h.DB.Collection("users")
	var user models.User
	err := col.FindOne(c.Request.Context(), bson.M{"email": body.Email}).Decode(&user)
	if err != nil {
		// Don't reveal whether the email exists — always return success
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "If an account with that email exists, a password reset link has been sent.",
		})
		return
	}

	// Generate a random 32-byte token
	rawToken := make([]byte, 32)
	if _, err := rand.Read(rawToken); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate reset token")
		return
	}
	plainToken := hex.EncodeToString(rawToken)

	// Store SHA-256 hash of the token in the DB (never store the raw token)
	hash := sha256.Sum256([]byte(plainToken))
	hashedToken := hex.EncodeToString(hash[:])

	// Token expires in 10 minutes
	expiresAt := time.Now().Add(10 * time.Minute)

	col.UpdateOne(c.Request.Context(), bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"passwordResetToken":   hashedToken,
			"passwordResetExpires": expiresAt,
			"updatedAt":            time.Now(),
		},
	})

	response := gin.H{
		"success": true,
		"message": "If an account with that email exists, a password reset link has been sent.",
	}

	resetURL := fmt.Sprintf("%s/reset-password/%s", h.Cfg.ClientURL, plainToken)

	// Send email if SMTP is configured
	if h.EmailService != nil && h.EmailService.IsConfigured() {
		userName := user.FirstName
		if userName == "" {
			userName = user.Username
		}
		if err := h.EmailService.SendPasswordReset(user.Email, resetURL, userName); err != nil {
			log.Printf("⚠️  Email send failed (token still valid): %v", err)
			// Don't fail the request — token is still stored and usable
		}
	} else {
		log.Println("⚠️  SMTP not configured — email not sent")
	}

	// In development mode, also return the token in the response for testing
	if h.Cfg.NodeEnv == "development" {
		response["data"] = gin.H{
			"resetToken": plainToken,
			"resetURL":   resetURL,
			"expiresAt":  expiresAt,
			"note":       "This token is only returned in development mode.",
		}
	}

	c.JSON(http.StatusOK, response)
}

// ResetPassword handles POST /api/auth/reset-password/:token.
// Validates the reset token and sets the new password.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		middleware.AbortWithError(c, http.StatusBadRequest, "Reset token is required")
		return
	}

	var body struct {
		Password        string `json:"password" binding:"required,min=8"`
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	if body.Password != body.ConfirmPassword {
		middleware.AbortWithError(c, http.StatusBadRequest, "Passwords do not match")
		return
	}

	// Hash the incoming token and look up the user
	hash := sha256.Sum256([]byte(token))
	hashedToken := hex.EncodeToString(hash[:])

	col := h.DB.Collection("users")
	var user models.User
	err := col.FindOne(c.Request.Context(), bson.M{
		"passwordResetToken":   hashedToken,
		"passwordResetExpires": bson.M{"$gt": time.Now()},
	}).Decode(&user)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid or expired reset token")
		return
	}

	// Hash new password
	user.Password = body.Password
	if err := user.HashPassword(); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	now := time.Now()
	col.UpdateOne(c.Request.Context(), bson.M{"_id": user.ID}, bson.M{
		"$set": bson.M{
			"password":          user.Password,
			"passwordChangedAt": now,
			"updatedAt":         now,
		},
		"$unset": bson.M{
			"passwordResetToken":   "",
			"passwordResetExpires": "",
		},
	})

	// Generate new JWT so user is logged in after reset
	jwtToken, cookie, err := utils.CreateTokenResponse(user.ID.Hex(), h.Cfg)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset successful. You are now logged in.",
		"data":    gin.H{"token": jwtToken},
	})
}
