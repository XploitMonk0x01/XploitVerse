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
)

// TaskHandler holds dependencies for task endpoints.
type TaskHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

// GetTaskByID handles GET /api/tasks/:id.
func (h *TaskHandler) GetTaskByID(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	col := h.DB.Collection("tasks")
	var task models.Task
	if err := col.FindOne(c.Request.Context(), bson.M{"_id": objID, "isPublished": true}).Decode(&task); err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Task not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"task": task},
	})
}

// CreateTask handles POST /api/admin/modules/:moduleId/tasks.
func (h *TaskHandler) CreateTask(c *gin.Context) {
	moduleID := c.Param("moduleId")
	moduleObjID, err := bson.ObjectIDFromHex(moduleID)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid module ID")
		return
	}

	var body struct {
		Title       string   `json:"title" binding:"required,min=3,max=160"`
		Type        string   `json:"type" binding:"required"`
		Order       int      `json:"order"`
		Prompt      string   `json:"prompt"`
		ContentMD   string   `json:"contentMd"`
		Hints       []string `json:"hints"`
		Points      int      `json:"points"`
		HintPenalty int      `json:"hintPenalty"`
		FlagHash    string   `json:"flagHash"`
		IsPublished bool     `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	now := time.Now()
	task := models.Task{
		ModuleID:     moduleObjID,
		Title:        body.Title,
		Type:         body.Type,
		Order:        body.Order,
		Prompt:       body.Prompt,
		ContentMD:    body.ContentMD,
		Hints:        body.Hints,
		Points:       body.Points,
		HintPenalty:  body.HintPenalty,
		FlagHash:     body.FlagHash,
		IsPublished:  body.IsPublished,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	col := h.DB.Collection("tasks")
	res, err := col.InsertOne(c.Request.Context(), task)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create task")
		return
	}
	task.ID = res.InsertedID.(bson.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Task created",
		"data":    gin.H{"task": task},
	})
}

// UpdateTask handles PUT /api/admin/tasks/:id.
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	var body struct {
		Title       *string  `json:"title"`
		Type        *string  `json:"type"`
		Order       *int     `json:"order"`
		Prompt      *string  `json:"prompt"`
		ContentMD   *string  `json:"contentMd"`
		Hints       []string `json:"hints"`
		Points      *int     `json:"points"`
		HintPenalty *int     `json:"hintPenalty"`
		FlagHash    *string  `json:"flagHash"`
		IsPublished *bool    `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	set := bson.M{"updatedAt": time.Now()}
	if body.Title != nil {
		set["title"] = *body.Title
	}
	if body.Type != nil {
		set["type"] = *body.Type
	}
	if body.Order != nil {
		set["order"] = *body.Order
	}
	if body.Prompt != nil {
		set["prompt"] = *body.Prompt
	}
	if body.ContentMD != nil {
		set["contentMd"] = *body.ContentMD
	}
	if body.Hints != nil {
		set["hints"] = body.Hints
	}
	if body.Points != nil {
		set["points"] = *body.Points
	}
	if body.HintPenalty != nil {
		set["hintPenalty"] = *body.HintPenalty
	}
	if body.FlagHash != nil {
		set["flagHash"] = *body.FlagHash
	}
	if body.IsPublished != nil {
		set["isPublished"] = *body.IsPublished
	}

	col := h.DB.Collection("tasks")
	res, err := col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{"$set": set})
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to update task")
		return
	}
	if res.MatchedCount == 0 {
		middleware.AbortWithError(c, http.StatusNotFound, "Task not found")
		return
	}

	var updated models.Task
	if err := col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&updated); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch updated task")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task updated",
		"data":    gin.H{"task": updated},
	})
}
