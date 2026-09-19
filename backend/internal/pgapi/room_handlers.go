package pgapi

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Force imports to be recognized as used
var _ *pgxpool.Pool

func (a *API) findRoomByIDOrSlug(ctx context.Context, idOrSlug string) (int64, string, string, string, string, bool, time.Time, error) {
	idOrSlug = strings.TrimSpace(idOrSlug)
	if id, err := strconv.ParseInt(idOrSlug, 10, 64); err == nil && id > 0 {
		var (
			slug, title, description, difficulty string
			isPublic                             bool
			createdAt                            time.Time
		)
		err := a.DB.QueryRow(ctx, `
			SELECT slug, title, description, difficulty, is_public, created_at
			FROM rooms WHERE id=$1 AND is_public=true
		`, id).Scan(&slug, &title, &description, &difficulty, &isPublic, &createdAt)
		if err == nil {
			return id, slug, title, description, difficulty, isPublic, createdAt, nil
		}
	}

	var (
		id                                   int64
		slug, title, description, difficulty string
		isPublic                             bool
		createdAt                            time.Time
	)
	err := a.DB.QueryRow(ctx, `
		SELECT id, slug, title, description, difficulty, is_public, created_at
		FROM rooms WHERE slug=$1 AND is_public=true
	`, idOrSlug).Scan(&id, &slug, &title, &description, &difficulty, &isPublic, &createdAt)
	return id, slug, title, description, difficulty, isPublic, createdAt, err
}

func (a *API) GetRooms(c *gin.Context) {
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, slug, title, description, difficulty, is_public, created_at
		FROM rooms
		WHERE is_public=true
		ORDER BY created_at DESC
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch rooms")
		return
	}
	defer rows.Close()

	rooms := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var slug, title, description, difficulty string
		var isPublic bool
		var createdAt time.Time
		if err := rows.Scan(&id, &slug, &title, &description, &difficulty, &isPublic, &createdAt); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode rooms")
			return
		}
		rooms = append(rooms, gin.H{
			"id":          id,
			"slug":        slug,
			"title":       title,
			"description": description,
			"difficulty":  difficulty,
			"is_public":   isPublic,
			"created_at":  createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"rooms": rooms}})
}

func (a *API) GetRoomByID(c *gin.Context) {
	id, slug, title, description, difficulty, isPublic, createdAt, err := a.findRoomByIDOrSlug(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeErr(c, http.StatusNotFound, "Room not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"room": gin.H{
		"id": id, "slug": slug, "title": title, "description": description,
		"difficulty": difficulty, "is_public": isPublic, "created_at": createdAt,
	}}})
}

func (a *API) GetRoomTasks(c *gin.Context) {
	roomID, _, _, _, _, _, _, err := a.findRoomByIDOrSlug(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeErr(c, http.StatusNotFound, "Room not found")
		return
	}

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT t.id, t.module_id, t.asset_id, t.title,
			COALESCE(NULLIF(t.body_markdown,''), t.prompt) AS body_markdown,
			t.order_no, t.points, t.flag_type, COALESCE(m.order_no, 0) AS module_order
		FROM tasks t
		LEFT JOIN modules m ON m.id = t.module_id
		WHERE t.room_id=$1 AND t.is_published=true
		ORDER BY module_order ASC, t.order_no ASC
	`, roomID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch tasks")
		return
	}
	defer rows.Close()

	tasks := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var moduleID, assetID *int64
		var title, bodyMarkdown, flagType string
		var orderNo, points, moduleOrder int64
		if err := rows.Scan(&id, &moduleID, &assetID, &title, &bodyMarkdown, &orderNo, &points, &flagType, &moduleOrder); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode tasks")
			return
		}
		if strings.TrimSpace(flagType) == "" {
			flagType = "string"
		}
		tasks = append(tasks, gin.H{
			"id":           id,
			"roomId":       roomID,
			"moduleId":     moduleID,
			"assetId":      assetID,
			"title":        title,
			"bodyMarkdown": bodyMarkdown,
			"orderNo":      orderNo,
			"points":       points,
			"flagType":     flagType,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"tasks": tasks}})
}