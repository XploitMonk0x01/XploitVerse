package handlers

import (
	"fmt"
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

// LabSessionHandler holds dependencies for lab session endpoints.
type LabSessionHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

// CreateLabSession handles POST /api/lab-sessions.
func (h *LabSessionHandler) CreateLabSession(c *gin.Context) {
	user := middleware.GetUser(c)

	var body struct {
		LabType     string `json:"labType"`
		LabName     string `json:"labName"`
		Description string `json:"description"`
		Difficulty  string `json:"difficulty"`
		MaxDuration int    `json:"maxDuration"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	col := h.DB.Collection("labsessions")

	// Check for existing active session
	count, _ := col.CountDocuments(c.Request.Context(), bson.M{
		"user":   user.ID,
		"status": bson.M{"$in": []string{models.StatusPending, models.StatusInitializing, models.StatusRunning}},
	})
	if count > 0 {
		middleware.AbortWithError(c, http.StatusBadRequest, "You already have an active lab session. Please terminate it before starting a new one.")
		return
	}

	labType := body.LabType
	if labType == "" {
		labType = models.LabTypeWebExploitation
	}
	labName := body.LabName
	if labName == "" {
		labName = "Untitled Lab"
	}
	maxDuration := body.MaxDuration
	if maxDuration == 0 {
		maxDuration = 240
	}

	now := time.Now()
	session := models.LabSession{
		User:            user.ID,
		LabType:         labType,
		LabName:         labName,
		Description:     body.Description,
		Difficulty:      body.Difficulty,
		Status:          models.StatusPending,
		AWSInstanceType: "t2.micro",
		AWSRegion:       h.Cfg.AWS.Region,
		MaxDuration:     maxDuration,
		HourlyRate:      h.Cfg.Lab.HourlyRate,
		StatusHistory: []models.StatusHistoryEntry{
			{Status: models.StatusPending, Timestamp: now, Message: "Status changed to pending"},
		},
		ActivityLog: []models.ActivityLogEntry{
			{
				Action:    "session_created",
				Timestamp: now,
				Details:   bson.M{"requestedBy": user.Username, "labType": labType},
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := col.InsertOne(c.Request.Context(), session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create session")
		return
	}

	session.ID = result.InsertedID.(bson.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Lab session requested. Waiting for initialization...",
		"data":    gin.H{"session": session},
	})
}

// GetLabSessions handles GET /api/lab-sessions.
func (h *LabSessionHandler) GetLabSessions(c *gin.Context) {
	user := middleware.GetUser(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	labType := c.Query("labType")
	sortBy := c.DefaultQuery("sortBy", "createdAt")
	order := c.DefaultQuery("order", "desc")

	filter := bson.M{}
	// Students can only see their own sessions
	if user.Role == models.RoleStudent {
		filter["user"] = user.ID
	}
	if status != "" {
		filter["status"] = status
	}
	if labType != "" {
		filter["labType"] = labType
	}

	skip := int64((page - 1) * limit)
	sortOrder := -1
	if order == "asc" {
		sortOrder = 1
	}

	col := h.DB.Collection("labsessions")
	opts := options.Find().
		SetSort(bson.M{sortBy: sortOrder}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := col.Find(c.Request.Context(), filter, opts)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch sessions")
		return
	}
	defer cursor.Close(c.Request.Context())

	var sessions []models.LabSession
	if err := cursor.All(c.Request.Context(), &sessions); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode sessions")
		return
	}
	if sessions == nil {
		sessions = []models.LabSession{}
	}

	total, _ := col.CountDocuments(c.Request.Context(), filter)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"sessions": sessions,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": int(math.Ceil(float64(total) / float64(limit))),
			},
		},
	})
}

// GetLabSessionByID handles GET /api/lab-sessions/:id.
func (h *LabSessionHandler) GetLabSessionByID(c *gin.Context) {
	user := middleware.GetUser(c)
	id := c.Param("id")

	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab session not found")
		return
	}

	// Students can only view their own sessions
	if user.Role == models.RoleStudent && session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "You are not authorized to view this session")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"session": session},
	})
}

// GetActiveSession handles GET /api/lab-sessions/active.
func (h *LabSessionHandler) GetActiveSession(c *gin.Context) {
	user := middleware.GetUser(c)

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err := col.FindOne(c.Request.Context(), bson.M{
		"user":   user.ID,
		"status": bson.M{"$in": []string{models.StatusPending, models.StatusInitializing, models.StatusRunning}},
	}).Decode(&session)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"session": nil},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"session": session},
	})
}

// UpdateSessionStatus handles PATCH /api/lab-sessions/:id/status (Admin/Instructor).
func (h *LabSessionHandler) UpdateSessionStatus(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	var body struct {
		Status        string `json:"status" binding:"required"`
		AWSInstanceID string `json:"awsInstanceId"`
		PublicIP      string `json:"publicIp"`
		PrivateIP     string `json:"privateIp"`
		ErrorMessage  string `json:"errorMessage"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Status is required")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab session not found")
		return
	}

	// Validate status transition
	if !models.IsValidTransition(session.Status, body.Status) {
		middleware.AbortWithError(c, http.StatusBadRequest, fmt.Sprintf("Invalid status transition from %s to %s", session.Status, body.Status))
		return
	}

	now := time.Now()
	update := bson.M{
		"status":    body.Status,
		"updatedAt": now,
	}
	if body.AWSInstanceID != "" {
		update["awsInstanceId"] = body.AWSInstanceID
	}
	if body.PublicIP != "" {
		update["publicIp"] = body.PublicIP
	}
	if body.PrivateIP != "" {
		update["privateIp"] = body.PrivateIP
	}
	if body.ErrorMessage != "" {
		update["errorMessage"] = body.ErrorMessage
	}

	// Calculate final cost if terminated
	if body.Status == models.StatusTerminated && session.StartTime != nil {
		endTime := now
		minutes := int(math.Ceil(endTime.Sub(*session.StartTime).Minutes()))
		finalCost := math.Round((float64(minutes)/60.0)*session.HourlyRate*100) / 100
		update["endTime"] = endTime
		update["totalBillableMinutes"] = minutes
		update["finalCost"] = finalCost
	}

	col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": update,
		"$push": bson.M{
			"statusHistory": models.StatusHistoryEntry{
				Status:    body.Status,
				Timestamp: now,
				Message:   fmt.Sprintf("Status changed to %s", body.Status),
			},
		},
	})

	// Update user stats if terminated
	if body.Status == models.StatusTerminated {
		if finalCost, ok := update["finalCost"]; ok {
			h.DB.Collection("users").UpdateOne(c.Request.Context(), bson.M{"_id": session.User}, bson.M{
				"$inc": bson.M{
					"totalLabTime": update["totalBillableMinutes"],
					"totalSpent":   finalCost,
				},
			})
		}
	}

	// Re-fetch updated session
	col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Session status updated to %s", body.Status),
		"data":    gin.H{"session": session},
	})
}

// TerminateSession handles POST /api/lab-sessions/:id/terminate.
func (h *LabSessionHandler) TerminateSession(c *gin.Context) {
	user := middleware.GetUser(c)
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab session not found")
		return
	}

	// Students can only terminate their own sessions
	if user.Role == models.RoleStudent && session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "You are not authorized to terminate this session")
		return
	}

	if session.Status == models.StatusTerminated || session.Status == models.StatusStopped {
		middleware.AbortWithError(c, http.StatusBadRequest, "Session is already terminated or stopped")
		return
	}

	now := time.Now()
	update := bson.M{
		"status":    models.StatusTerminated,
		"updatedAt": now,
	}

	var totalMinutes int
	var finalCost float64
	if session.StartTime != nil {
		update["endTime"] = now
		totalMinutes = int(math.Ceil(now.Sub(*session.StartTime).Minutes()))
		finalCost = math.Round((float64(totalMinutes)/60.0)*session.HourlyRate*100) / 100
		update["totalBillableMinutes"] = totalMinutes
		update["finalCost"] = finalCost
	}

	col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": update,
		"$push": bson.M{
			"statusHistory": models.StatusHistoryEntry{
				Status:    models.StatusTerminated,
				Timestamp: now,
				Message:   "Status changed to terminated",
			},
		},
	})

	// Update user stats
	if finalCost > 0 {
		h.DB.Collection("users").UpdateOne(c.Request.Context(), bson.M{"_id": session.User}, bson.M{
			"$inc": bson.M{
				"totalLabTime": totalMinutes,
				"totalSpent":   finalCost,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab session terminated successfully",
		"data": gin.H{
			"session": session,
			"billing": gin.H{
				"duration":     fmt.Sprintf("%dm", totalMinutes),
				"totalMinutes": totalMinutes,
				"cost":         finalCost,
			},
		},
	})
}

// GetSessionStats handles GET /api/lab-sessions/stats (Admin/Instructor).
func (h *LabSessionHandler) GetSessionStats(c *gin.Context) {
	col := h.DB.Collection("labsessions")

	// Aggregate by status
	statusPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":          "$status",
			"count":        bson.M{"$sum": 1},
			"totalMinutes": bson.M{"$sum": "$totalBillableMinutes"},
			"totalCost":    bson.M{"$sum": "$finalCost"},
		}}},
	}
	statusCursor, err := col.Aggregate(c.Request.Context(), statusPipeline)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch stats")
		return
	}
	defer statusCursor.Close(c.Request.Context())
	var byStatus []bson.M
	statusCursor.All(c.Request.Context(), &byStatus)

	// Aggregate by type
	typePipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":   "$labType",
			"count": bson.M{"$sum": 1},
		}}},
	}
	typeCursor, err := col.Aggregate(c.Request.Context(), typePipeline)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch type stats")
		return
	}
	defer typeCursor.Close(c.Request.Context())
	var byType []bson.M
	typeCursor.All(c.Request.Context(), &byType)

	totalSessions, _ := col.CountDocuments(c.Request.Context(), bson.M{})
	activeSessions, _ := col.CountDocuments(c.Request.Context(), bson.M{
		"status": bson.M{"$in": []string{models.StatusPending, models.StatusInitializing, models.StatusRunning}},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalSessions":  totalSessions,
			"activeSessions": activeSessions,
			"byStatus":       byStatus,
			"byType":         byType,
		},
	})
}

// UpdateSessionNotes handles PATCH /api/lab-sessions/:id/notes.
func (h *LabSessionHandler) UpdateSessionNotes(c *gin.Context) {
	user := middleware.GetUser(c)
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	var body struct {
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab session not found")
		return
	}

	if session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "You are not authorized to update this session")
		return
	}

	col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"userNotes": body.Notes,
			"updatedAt": time.Now(),
		},
	})

	// Re-fetch
	col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Notes updated successfully",
		"data":    gin.H{"session": session},
	})
}
