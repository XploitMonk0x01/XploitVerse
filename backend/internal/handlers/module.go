package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// ModuleHandler holds dependencies for module endpoints.
type ModuleHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

// GetModuleByID handles GET /api/modules/:id.
func (h *ModuleHandler) GetModuleByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid module ID")
		return
	}

	moduleCol := h.DB.Collection("modules")
	taskCol := h.DB.Collection("tasks")

	var module models.Module
	if err := moduleCol.FindOne(c.Request.Context(), bson.M{"_id": objID, "isPublished": true}).Decode(&module); err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Module not found")
		return
	}

	cur, err := taskCol.Find(
		c.Request.Context(),
		bson.M{"moduleId": module.ID, "isPublished": true},
		options.Find().SetSort(bson.M{"order": 1}),
	)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch tasks")
		return
	}
	defer cur.Close(c.Request.Context())

	var tasks []models.Task
	if err := cur.All(c.Request.Context(), &tasks); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode tasks")
		return
	}
	if tasks == nil {
		tasks = []models.Task{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"module": module,
			"tasks":  tasks,
		},
	})
}

// CreateModule handles POST /api/admin/courses/:courseId/modules.
func (h *ModuleHandler) CreateModule(c *gin.Context) {
	courseID := c.Param("courseId")
	courseObjID, err := bson.ObjectIDFromHex(courseID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid course ID")
		return
	}

	var body struct {
		Title        string `json:"title" binding:"required,min=3,max=120"`
		Description  string `json:"description"`
		Order        int    `json:"order"`
		PointsReward int    `json:"pointsReward"`
		IsPublished  bool   `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	now := time.Now()
	module := models.Module{
		CourseID:     courseObjID,
		Title:        body.Title,
		Description:  body.Description,
		Order:        body.Order,
		PointsReward: body.PointsReward,
		IsPublished:  body.IsPublished,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	col := h.DB.Collection("modules")
	res, err := col.InsertOne(c.Request.Context(), module)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create module")
		return
	}
	module.ID = res.InsertedID.(bson.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Module created",
		"data":    gin.H{"module": module},
	})
}

// UpdateModule handles PUT /api/admin/modules/:id.
func (h *ModuleHandler) UpdateModule(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid module ID")
		return
	}

	var body struct {
		Title        *string `json:"title"`
		Description  *string `json:"description"`
		Order        *int    `json:"order"`
		PointsReward *int    `json:"pointsReward"`
		IsPublished  *bool   `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	set := bson.M{"updatedAt": time.Now()}
	if body.Title != nil {
		set["title"] = *body.Title
	}
	if body.Description != nil {
		set["description"] = *body.Description
	}
	if body.Order != nil {
		set["order"] = *body.Order
	}
	if body.PointsReward != nil {
		set["pointsReward"] = *body.PointsReward
	}
	if body.IsPublished != nil {
		set["isPublished"] = *body.IsPublished
	}

	col := h.DB.Collection("modules")
	res, err := col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{"$set": set})
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to update module")
		return
	}
	if res.MatchedCount == 0 {
		middleware.AbortWithError(c, http.StatusNotFound, "Module not found")
		return
	}

	var updated models.Module
	if err := col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&updated); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch updated module")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Module updated",
		"data":    gin.H{"module": updated},
	})
}
