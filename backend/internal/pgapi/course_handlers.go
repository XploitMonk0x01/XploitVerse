package pgapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (a *API) GetCourses(c *gin.Context) {
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, slug, title, description, difficulty, is_public, created_at
		FROM rooms
		WHERE is_public = true
		ORDER BY created_at DESC
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch courses")
		return
	}
	defer rows.Close()

	courses := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var slug, title, description, difficulty string
		var isPublic bool
		var createdAt time.Time
		if err := rows.Scan(&id, &slug, &title, &description, &difficulty, &isPublic, &createdAt); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode courses")
			return
		}
		courses = append(courses, gin.H{
			"id":          id,
			"slug":        slug,
			"title":       title,
			"description": description,
			"difficulty":  difficulty,
			"isPremium":   false,
			"isPublished": isPublic,
			"tags":        []string{},
			"createdAt":   createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"courses": courses}})
}

func (a *API) GetCourseBySlug(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		writeErr(c, http.StatusBadRequest, "Invalid slug")
		return
	}

	var roomID int64
	var title, description, difficulty string
	var isPublished bool
	var createdAt time.Time
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id, slug, title, description, difficulty, is_public, created_at
		FROM rooms WHERE slug=$1 AND is_public=true
	`, slug).Scan(&roomID, &slug, &title, &description, &difficulty, &isPublished, &createdAt)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Course not found")
		return
	}

	course := gin.H{
		"id":          roomID,
		"slug":        slug,
		"title":       title,
		"description": description,
		"difficulty":  difficulty,
		"isPremium":   false,
		"isPublished": isPublished,
		"tags":        []string{},
		"createdAt":   createdAt,
	}

	modulesRows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, title, description, order_no, points_reward
		FROM modules
		WHERE room_id=$1 AND is_published=true
		ORDER BY order_no ASC
	`, roomID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch modules")
		return
	}
	defer modulesRows.Close()

	modules := make([]gin.H, 0)
	for modulesRows.Next() {
		var id, orderNo, pointsReward int64
		var title, description string
		if err := modulesRows.Scan(&id, &title, &description, &orderNo, &pointsReward); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode modules")
			return
		}
		modules = append(modules, gin.H{
			"id":           id,
			"title":        title,
			"description":  description,
			"order":        orderNo,
			"pointsReward": pointsReward,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"course": course, "modules": modules}})
}

func (a *API) GetModuleByID(c *gin.Context) {
	moduleID, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var roomID, orderNo, pointsReward int64
	var title, description string
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT room_id, title, description, order_no, points_reward
		FROM modules WHERE id=$1 AND is_published=true
	`, moduleID).Scan(&roomID, &title, &description, &orderNo, &pointsReward)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Module not found")
		return
	}

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, title, type, order_no, points, prompt
		FROM tasks
		WHERE module_id=$1 AND is_published=true
		ORDER BY order_no ASC
	`, moduleID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch tasks")
		return
	}
	defer rows.Close()

	tasks := make([]gin.H, 0)
	for rows.Next() {
		var id, order, points int64
		var tType, tTitle, prompt string
		if err := rows.Scan(&id, &tTitle, &tType, &order, &points, &prompt); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode tasks")
			return
		}
		tasks = append(tasks, gin.H{
			"id":          id,
			"title":       tTitle,
			"type":        tType,
			"order":       order,
			"points":      points,
			"description": prompt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"module": gin.H{
				"id":           moduleID,
				"roomId":       roomID,
				"title":        title,
				"description":  description,
				"order":        orderNo,
				"pointsReward": pointsReward,
			},
			"tasks": tasks,
		},
	})
}

func (a *API) GetTaskByID(c *gin.Context) {
	taskID, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var (
		roomID                                                 int64
		moduleID                                               *int64
		assetID                                                *int64
		title, tType, flagType, bodyMarkdown, prompt, flagHash string
		hintsRaw                                               []byte
		orderNo, points, hintPenalty                           int64
		isPublished                                            bool
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt,
			hints_json, order_no, points, hint_penalty, COALESCE(flag_hash,''), is_published
		FROM tasks
		WHERE id=$1 AND is_published=true
	`, taskID).Scan(
		&roomID, &moduleID, &assetID, &title, &tType, &flagType, &bodyMarkdown, &prompt,
		&hintsRaw, &orderNo, &points, &hintPenalty, &flagHash, &isPublished,
	)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Task not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task": gin.H{
				"id":          taskID,
				"roomId":      roomID,
				"moduleId":    moduleID,
				"assetId":     assetID,
				"title":       title,
				"type":        tType,
				"flagType":    flagType,
				"contentMd":   bodyMarkdown,
				"prompt":      prompt,
				"hints":       parseJSONStringArray(hintsRaw),
				"order":       orderNo,
				"points":      points,
				"hintPenalty": hintPenalty,
				"isPublished": isPublished,
				"hasFlag":     flagHash != "",
			},
		},
	})
}