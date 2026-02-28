package handlers

import (
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"github.com/xploitverse/backend/internal/services"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// LabHandler holds dependencies for lab endpoints.
type LabHandler struct {
	DB        *mongo.Database
	Cfg       *config.Config
	DockerSvc *services.DockerService
}

// generateFakeIP generates a mock private IP address.
func generateFakeIP() string {
	return fmt.Sprintf("10.0.0.%d", rand.Intn(254)+1)
}

// GetAllLabs handles GET /api/labs.
func (h *LabHandler) GetAllLabs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	category := c.Query("category")
	difficulty := c.Query("difficulty")
	search := c.Query("search")

	filter := bson.M{"isActive": true, "isPublished": true}
	if category != "" {
		filter["category"] = category
	}
	if difficulty != "" {
		filter["difficulty"] = difficulty
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": search, "$options": "i"}},
			{"description": bson.M{"$regex": search, "$options": "i"}},
			{"tags": bson.M{"$in": []bson.M{{"$regex": search, "$options": "i"}}}},
		}
	}

	skip := int64((page - 1) * limit)
	col := h.DB.Collection("labs")

	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := col.Find(c.Request.Context(), filter, opts)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch labs")
		return
	}
	defer cursor.Close(c.Request.Context())

	var labs []models.Lab
	if err := cursor.All(c.Request.Context(), &labs); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode labs")
		return
	}
	if labs == nil {
		labs = []models.Lab{}
	}

	total, _ := col.CountDocuments(c.Request.Context(), filter)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"labs": labs,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": int(math.Ceil(float64(total) / float64(limit))),
			},
		},
	})
}

// GetLabByID handles GET /api/labs/:id.
func (h *LabHandler) GetLabByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid lab ID")
		return
	}

	col := h.DB.Collection("labs")
	var lab models.Lab
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&lab)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"lab": lab},
	})
}

// StartLab handles POST /api/labs/start.
func (h *LabHandler) StartLab(c *gin.Context) {
	user := middleware.GetUser(c)

	var body struct {
		LabID string `json:"labId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Lab ID is required")
		return
	}

	labObjID, err := bson.ObjectIDFromHex(body.LabID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid lab ID")
		return
	}

	// Find the lab
	labCol := h.DB.Collection("labs")
	var lab models.Lab
	err = labCol.FindOne(c.Request.Context(), bson.M{"_id": labObjID}).Decode(&lab)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Lab not found")
		return
	}

	if !lab.IsActive || !lab.IsPublished {
		middleware.AbortWithError(c, http.StatusBadRequest, "This lab is not currently available")
		return
	}

	// Check for existing active session
	sessionCol := h.DB.Collection("labsessions")
	count, _ := sessionCol.CountDocuments(c.Request.Context(), bson.M{
		"user":   user.ID,
		"status": bson.M{"$in": []string{models.StatusPending, models.StatusInitializing, models.StatusRunning}},
	})
	if count > 0 {
		middleware.AbortWithError(c, http.StatusBadRequest, "You already have an active lab session. Please stop it before starting a new one.")
		return
	}

	now := time.Now()
	session := models.LabSession{
		User:            user.ID,
		LabType:         strings.ToLower(strings.ReplaceAll(lab.Category, " ", "_")),
		LabName:         lab.Title,
		Description:     lab.Description,
		Difficulty:      strings.ToLower(lab.Difficulty),
		Status:          models.StatusInitializing,
		AWSInstanceType: "t2.micro",
		AWSRegion:       h.Cfg.AWS.Region,
		MaxDuration:     240,
		HourlyRate:      h.Cfg.Lab.HourlyRate,
		Metadata: bson.M{
			"labId":             lab.ID,
			"category":          lab.Category,
			"estimatedDuration": lab.EstimatedDuration,
		},
		StatusHistory: []models.StatusHistoryEntry{
			{Status: models.StatusInitializing, Timestamp: now, Message: "Status changed to initializing"},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	result, err := sessionCol.InsertOne(c.Request.Context(), session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create session")
		return
	}

	sessionID := result.InsertedID.(bson.ObjectID).Hex()

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Provisioning cloud environment...",
		"data": gin.H{
			"session": gin.H{
				"id":      sessionID,
				"status":  session.Status,
				"labName": session.LabName,
			},
		},
	})
}

// CheckSessionStatus handles GET /api/labs/session/:sessionId/status.
func (h *LabHandler) CheckSessionStatus(c *gin.Context) {
	user := middleware.GetUser(c)
	sessionID := c.Param("sessionId")

	objID, err := bson.ObjectIDFromHex(sessionID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Session not found")
		return
	}

	if session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "Not authorized to access this session")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"session": session},
	})
}

// CompleteProvisioning handles POST /api/labs/session/:sessionId/provision.
func (h *LabHandler) CompleteProvisioning(c *gin.Context) {
	user := middleware.GetUser(c)
	sessionID := c.Param("sessionId")

	objID, err := bson.ObjectIDFromHex(sessionID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Session not found")
		return
	}

	if session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "Not authorized to access this session")
		return
	}

	if session.Status != models.StatusInitializing {
		middleware.AbortWithError(c, http.StatusBadRequest, "Session is not in initializing state")
		return
	}

	// Determine Docker image for this lab type (configurable per-lab; defaults to ubuntu:latest)
	labImage := "ubuntu:latest"
	if session.DockerImage != "" {
		labImage = session.DockerImage
	}
	containerName := fmt.Sprintf("xv-lab-%s", objID.Hex())

	// Determine memory limit (default 512 MB)
	memMB := int64(512)
	if md, ok := session.Metadata.(bson.M); ok {
		if labID, ok := md["labId"]; ok {
			var lab models.Lab
			labCol := h.DB.Collection("labs")
			if err := labCol.FindOne(c.Request.Context(), bson.M{"_id": labID}).Decode(&lab); err == nil {
				if lab.DockerImage != "" {
					labImage = lab.DockerImage
				}
				if lab.MemoryMB > 0 {
					memMB = lab.MemoryMB
				}
			}
		}
	}

	// Spawn Docker container (falls back to mock if Docker daemon unavailable)
	containerID, containerIP, spawnErr := h.DockerSvc.SpawnContainer(
		c.Request.Context(),
		labImage,
		containerName,
		memMB, // memMB
		512,   // cpuShares
	)
	if spawnErr != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to start lab container: "+spawnErr.Error())
		return
	}

	if containerIP == "" {
		containerIP = fmt.Sprintf("172.20.%d.%d", rand.Intn(254)+1, rand.Intn(254)+1)
	}

	now := time.Now()
	autoTerminateAt := now.Add(time.Duration(session.MaxDuration) * time.Minute)

	col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"status":          models.StatusRunning,
			"startTime":       now,
			"containerId":     containerID,
			"dockerImage":     labImage,
			"publicIp":        containerIP,
			"privateIp":       containerIP,
			"autoTerminateAt": autoTerminateAt,
			"updatedAt":       now,
		},
		"$push": bson.M{
			"statusHistory": models.StatusHistoryEntry{
				Status:    models.StatusRunning,
				Timestamp: now,
				Message:   "Status changed to running",
			},
			"activityLog": models.ActivityLogEntry{
				Action:    "lab_started",
				Timestamp: now,
				Details: bson.M{
					"containerId": containerID,
					"ip":         containerIP,
					"image":      labImage,
					"docker":     h.DockerSvc.Available(),
				},
			},
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab environment is now active!",
		"data": gin.H{
			"session": gin.H{
				"id":              objID.Hex(),
				"status":          models.StatusRunning,
				"labName":         session.LabName,
				"publicIp":        containerIP,
				"startTime":       now,
				"autoTerminateAt": autoTerminateAt,
				"containerId":     containerID,
				"dockerMode":      h.DockerSvc.Available(),
			},
		},
	})
}

// StopLab handles POST /api/labs/stop.
func (h *LabHandler) StopLab(c *gin.Context) {
	user := middleware.GetUser(c)

	var body struct {
		SessionID string `json:"sessionId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Session ID is required")
		return
	}

	objID, err := bson.ObjectIDFromHex(body.SessionID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid session ID")
		return
	}

	col := h.DB.Collection("labsessions")
	var session models.LabSession
	err = col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&session)
	if err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Session not found")
		return
	}

	if session.User != user.ID {
		middleware.AbortWithError(c, http.StatusForbidden, "Not authorized to stop this session")
		return
	}

	if session.Status != models.StatusPending && session.Status != models.StatusInitializing && session.Status != models.StatusRunning {
		middleware.AbortWithError(c, http.StatusBadRequest, fmt.Sprintf("Cannot stop session with status: %s", session.Status))
		return
	}

	// Stop Docker container if one is running
	if session.ContainerID != "" {
		_ = h.DockerSvc.StopContainer(c.Request.Context(), session.ContainerID)
	}

	now := time.Now()
	var totalMinutes int
	var finalCost float64

	if session.StartTime != nil {
		durationMs := now.Sub(*session.StartTime)
		totalMinutes = int(math.Ceil(durationMs.Minutes()))
		finalCost = math.Round((float64(totalMinutes)/60.0)*session.HourlyRate*100) / 100
	}

	col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"status":               models.StatusStopped,
			"endTime":              now,
			"totalBillableMinutes": totalMinutes,
			"finalCost":            finalCost,
			"updatedAt":            now,
		},
		"$push": bson.M{
			"statusHistory": models.StatusHistoryEntry{
				Status:    models.StatusStopped,
				Timestamp: now,
				Message:   "Status changed to stopped",
			},
			"activityLog": models.ActivityLogEntry{
				Action:    "lab_stopped",
				Timestamp: now,
				Details: bson.M{
					"duration":    totalMinutes,
					"cost":        finalCost,
					"containerId": session.ContainerID,
				},
			},
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab session stopped successfully",
		"data": gin.H{
			"session": gin.H{
				"id":            objID.Hex(),
				"status":        models.StatusStopped,
				"labName":       session.LabName,
				"startTime":     session.StartTime,
				"endTime":       now,
				"duration":      fmt.Sprintf("%dm", totalMinutes),
				"totalMinutes":  totalMinutes,
				"cost":          finalCost,
			},
		},
	})
}

// GetActiveSession handles GET /api/labs/active-session.
func (h *LabHandler) GetActiveSession(c *gin.Context) {
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

// GetSessionHistory handles GET /api/labs/history.
func (h *LabHandler) GetSessionHistory(c *gin.Context) {
	user := middleware.GetUser(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	skip := int64((page - 1) * limit)
	col := h.DB.Collection("labsessions")

	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := col.Find(c.Request.Context(), bson.M{"user": user.ID}, opts)
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

	total, _ := col.CountDocuments(c.Request.Context(), bson.M{"user": user.ID})

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

// randomString generates a random alphanumeric string.
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
