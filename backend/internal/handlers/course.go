package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// CourseHandler holds dependencies for course endpoints.
type CourseHandler struct {
	DB  *mongo.Database
	Cfg *config.Config
}

var slugNonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(input string) string {
	s := strings.ToLower(strings.TrimSpace(input))
	s = slugNonAlnum.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "course"
	}
	return s
}

// GetAllCourses handles GET /api/courses.
func (h *CourseHandler) GetAllCourses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	search := c.Query("search")
	difficulty := c.Query("difficulty")

	filter := bson.M{"isPublished": true}
	if difficulty != "" {
		filter["difficulty"] = difficulty
	}
	if search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": search, "$options": "i"}},
			{"description": bson.M{"$regex": search, "$options": "i"}},
			// Regex matches any element within the tags array.
			{"tags": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	skip := int64((page - 1) * limit)
	col := h.DB.Collection("courses")

	opts := options.Find().
		SetSort(bson.M{"createdAt": -1}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := col.Find(c.Request.Context(), filter, opts)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch courses")
		return
	}
	defer cursor.Close(c.Request.Context())

	var courses []models.Course
	if err := cursor.All(c.Request.Context(), &courses); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode courses")
		return
	}
	if courses == nil {
		courses = []models.Course{}
	}

	total, _ := col.CountDocuments(c.Request.Context(), filter)
	pages := (total + int64(limit) - 1) / int64(limit)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"courses": courses,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": pages,
			},
		},
	})
}

// GetCourseBySlug handles GET /api/courses/:slug.
func (h *CourseHandler) GetCourseBySlug(c *gin.Context) {
	slug := c.Param("slug")

	courseCol := h.DB.Collection("courses")
	moduleCol := h.DB.Collection("modules")

	var course models.Course
	if err := courseCol.FindOne(c.Request.Context(), bson.M{"slug": slug, "isPublished": true}).Decode(&course); err != nil {
		middleware.AbortWithError(c, http.StatusNotFound, "Course not found")
		return
	}

	cur, err := moduleCol.Find(
		c.Request.Context(),
		bson.M{"courseId": course.ID, "isPublished": true},
		options.Find().SetSort(bson.M{"order": 1}),
	)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch modules")
		return
	}
	defer cur.Close(c.Request.Context())

	var modules []models.Module
	if err := cur.All(c.Request.Context(), &modules); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to decode modules")
		return
	}
	if modules == nil {
		modules = []models.Module{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"course":  course,
			"modules": modules,
		},
	})
}

// CreateCourse handles POST /api/admin/courses (Admin/Instructor).
func (h *CourseHandler) CreateCourse(c *gin.Context) {
	var body struct {
		Title       string   `json:"title" binding:"required,min=3,max=120"`
		Slug        string   `json:"slug"`
		Description string   `json:"description"`
		Difficulty  string   `json:"difficulty"`
		Category    string   `json:"category"`
		Tags        []string `json:"tags"`
		IsPremium   bool     `json:"isPremium"`
		IsPublished bool     `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	slug := strings.TrimSpace(body.Slug)
	if slug == "" {
		slug = slugify(body.Title)
	} else {
		slug = slugify(slug)
	}

	now := time.Now()
	course := models.Course{
		Title:       body.Title,
		Slug:        slug,
		Description: body.Description,
		Difficulty:  body.Difficulty,
		Category:    body.Category,
		Tags:        body.Tags,
		IsPremium:   body.IsPremium,
		IsPublished: body.IsPublished,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	col := h.DB.Collection("courses")
	result, err := col.InsertOne(c.Request.Context(), course)
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to create course")
		return
	}
	course.ID = result.InsertedID.(bson.ObjectID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Course created",
		"data":    gin.H{"course": course},
	})
}

// UpdateCourse handles PUT /api/admin/courses/:id (Admin/Instructor).
func (h *CourseHandler) UpdateCourse(c *gin.Context) {
	id := c.Param("id")
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Invalid course ID")
		return
	}

	var body struct {
		Title       *string  `json:"title"`
		Slug        *string  `json:"slug"`
		Description *string  `json:"description"`
		Difficulty  *string  `json:"difficulty"`
		Category    *string  `json:"category"`
		Tags        []string `json:"tags"`
		IsPremium   *bool    `json:"isPremium"`
		IsPublished *bool    `json:"isPublished"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.AbortWithError(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	set := bson.M{"updatedAt": time.Now()}
	if body.Title != nil {
		set["title"] = strings.TrimSpace(*body.Title)
	}
	if body.Description != nil {
		set["description"] = *body.Description
	}
	if body.Difficulty != nil {
		set["difficulty"] = *body.Difficulty
	}
	if body.Category != nil {
		set["category"] = *body.Category
	}
	if body.Tags != nil {
		set["tags"] = body.Tags
	}
	if body.IsPremium != nil {
		set["isPremium"] = *body.IsPremium
	}
	if body.IsPublished != nil {
		set["isPublished"] = *body.IsPublished
	}
	if body.Slug != nil {
		set["slug"] = slugify(*body.Slug)
	}

	col := h.DB.Collection("courses")
	res, err := col.UpdateOne(c.Request.Context(), bson.M{"_id": objID}, bson.M{"$set": set})
	if err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to update course")
		return
	}
	if res.MatchedCount == 0 {
		middleware.AbortWithError(c, http.StatusNotFound, "Course not found")
		return
	}

	var updated models.Course
	if err := col.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&updated); err != nil {
		middleware.AbortWithError(c, http.StatusInternalServerError, "Failed to fetch updated course")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Course updated",
		"data":    gin.H{"course": updated},
	})
}
