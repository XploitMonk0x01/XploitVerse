package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// UserHandler holds dependencies for user endpoints.
type UserHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

// GetAllUsers handles GET /api/users (Admin only).
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	role := c.Query("role")
	search := c.Query("search")
	sortBy := c.DefaultQuery("sortBy", "createdAt")
	order := c.DefaultQuery("order", "desc")

	filter := bson.M{}
	if role != "" {
		filter["role"] = role
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"username": bson.M{"$regex": search, "$options": "i"}},
			{"email": bson.M{"$regex": search, "$options": "i"}},
			{"firstName": bson.M{"$regex": search, "$options": "i"}},
			{"lastName": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	skip := int64((page - 1) * limit)
	sortOrder := -1
	if order == "asc" {
		sortOrder = 1
	}

	col := h.DB.Collection("users")
	opts := options.Find().
		SetSort(bson.M{sortBy: sortOrder}).
		SetSkip(skip).
		SetLimit(int64(limit)).
		SetProjection(bson.M{"password": 0})

	cursor, err := col.Find(c.Request.Context(), filter, opts)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch users")
		return
	}
	defer cursor.Close(c.Request.Context())

	var users []models.User
	if err := cursor.All(c.Request.Context(), &users); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode users")
		return
	}
	if users == nil {
		users = []models.User{}
	}

	total, _ := col.CountDocuments(c.Request.Context(), filter)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users": users,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": int(math.Ceil(float64(total) / float64(limit))),
			},
		},
	})
}

// GetUserByID handles GET /api/users/:id (Admin only).
func (h *UserHandler) GetUserByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	col := h.DB.Collection("users")
	var user models.User
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"user": user},
	})
}

// UpdateProfile handles PUT /api/users/profile.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	currentUser := middleware.GetUser(c)

	var body struct {
		FirstName   string             `json:"firstName"`
		LastName    string             `json:"lastName"`
		Username    string             `json:"username"`
		Preferences *models.Preferences `json:"preferences"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	col := h.DB.Collection("users")

	// Check if username is taken
	if body.Username != "" && body.Username != currentUser.Username {
		count, _ := col.CountDocuments(c.Request.Context(), bson.M{"username": body.Username})
		if count > 0 {
			middleware.AbortWithError(c, http.StatusBadRequest, "Username is already taken")
			return
		}
	}

	update := bson.M{"updatedAt": time.Now()}
	if body.FirstName != "" {
		update["firstName"] = body.FirstName
	}
	if body.LastName != "" {
		update["lastName"] = body.LastName
	}
	if body.Username != "" {
		update["username"] = body.Username
	}
	if body.Preferences != nil {
		update["preferences"] = body.Preferences
	}

	var updatedUser models.User
	err := col.FindOneAndUpdate(
		c.Request.Context(),
		bson.M{"_id": currentUser.ID},
		bson.M{"$set": update},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&updatedUser)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"data":    gin.H{"user": updatedUser},
	})
}

// UpdateUserRole handles PUT /api/users/:id/role (Admin only).
func (h *UserHandler) UpdateUserRole(c *gin.Context) {
	currentUser := middleware.GetUser(c)
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var body struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Role is required")
		return
	}

	if objID == currentUser.ID {
		middleware.AbortWithError(c, http.StatusBadRequest, "You cannot change your own role")
		return
	}

	col := h.DB.Collection("users")
	var user models.User
	err = col.FindOneAndUpdate(
		c.Request.Context(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"role": body.Role, "updatedAt": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&user)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User role updated to " + body.Role,
		"data":    gin.H{"user": user},
	})
}

// DeactivateUser handles PUT /api/users/:id/deactivate (Admin only).
func (h *UserHandler) DeactivateUser(c *gin.Context) {
	currentUser := middleware.GetUser(c)
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	if objID == currentUser.ID {
		middleware.AbortWithError(c, http.StatusBadRequest, "You cannot deactivate your own account")
		return
	}

	col := h.DB.Collection("users")
	result, err := col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{"isActive": false, "updatedAt": time.Now()},
	})
	if err != nil || result.MatchedCount == 0 {
		middleware.AbortWithError(c, http.StatusNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deactivated successfully",
	})
}

// ReactivateUser handles PUT /api/users/:id/reactivate (Admin only).
func (h *UserHandler) ReactivateUser(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid user ID")
		return
	}

	col := h.DB.Collection("users")
	result, err := col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{"isActive": true, "updatedAt": time.Now()},
	})
	if err != nil || result.MatchedCount == 0 {
		middleware.AbortWithError(c, http.StatusNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User reactivated successfully",
	})
}

// GetUserStats handles GET /api/users/stats (Admin/Instructor).
func (h *UserHandler) GetUserStats(c *gin.Context) {
	col := h.DB.Collection("users")

	// Aggregate by role
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":          "$role",
			"count":        bson.M{"$sum": 1},
			"totalLabTime": bson.M{"$sum": "$totalLabTime"},
			"totalSpent":   bson.M{"$sum": "$totalSpent"},
		}}},
	}

	cursor, err := col.Aggregate(c.Request.Context(), pipeline)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch stats")
		return
	}
	defer cursor.Close(c.Request.Context())

	var byRole []bson.M
	cursor.All(c.Request.Context(), &byRole)

	totalUsers, _ := col.CountDocuments(c.Request.Context(), bson.M{})
	activeUsers, _ := col.CountDocuments(c.Request.Context(), bson.M{"isActive": true})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalUsers":  totalUsers,
			"activeUsers": activeUsers,
			"byRole":      byRole,
		},
	})
}

// GetMyProgress handles GET /api/users/me/progress.
// Returns all task progress records for the authenticated user, including a
// summary of total points earned and number of tasks completed.
func (h *UserHandler) GetMyProgress(c *gin.Context) {
	user := middleware.GetUser(c)
	if user == nil {
		middleware.AbortWithError(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	col := h.DB.Collection("user_task_progress")

	cursor, err := col.Find(
		c.Request.Context(),
		bson.M{"userId": user.ID},
		options.Find().SetSort(bson.M{"completedAt": -1}),
	)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch progress")
		return
	}
	defer cursor.Close(c.Request.Context())

	var progress []models.UserTaskProgress
	if err := cursor.All(c.Request.Context(), &progress); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode progress")
		return
	}
	if progress == nil {
		progress = []models.UserTaskProgress{}
	}

	// Summarise
	var totalPoints, tasksCompleted int
	for _, p := range progress {
		totalPoints += p.PointsEarned
		if p.CompletedAt != nil {
			tasksCompleted++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"progress": progress,
			"summary": gin.H{
				"totalPoints":    totalPoints,
				"tasksCompleted": tasksCompleted,
				"totalAttempts":  len(progress),
			},
		},
	})
}
