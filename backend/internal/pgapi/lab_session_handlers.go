package pgapi

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/services"
)

// Force imports to be recognized as used
var _ *services.DockerService

func (a *API) StartTaskLabSession(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	taskID, ok := parseInt64Param(c, "task_id")
	if !ok {
		return
	}

	tx, err := a.DB.Begin(c.Request.Context())
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to begin transaction")
		return
	}
	defer tx.Rollback(c.Request.Context())

	var exists int64
	if err := tx.QueryRow(c.Request.Context(), `
		SELECT 1 FROM lab_sessions
		WHERE user_id=$1 AND status IN ('pending','initializing','running')
		LIMIT 1
	`, u.ID).Scan(&exists); err == nil {
		writeErr(c, http.StatusBadRequest, "You already have an active lab session")
		return
	}

	var (
		roomID                          int64
		assetID                         *int64
		title, bodyMarkdown, difficulty string
		dockerImage                     *string
		exposedPortsRaw                 []byte
	)
	err = tx.QueryRow(c.Request.Context(), `
		SELECT t.room_id, t.asset_id, t.title,
			COALESCE(NULLIF(t.body_markdown,''), t.prompt) AS body_markdown,
			r.difficulty,
			a.docker_image,
			a.exposed_ports_json
		FROM tasks t
		JOIN rooms r ON r.id=t.room_id
		LEFT JOIN assets a ON a.id=t.asset_id
		WHERE t.id=$1 AND t.is_published=true AND r.is_public=true
	`, taskID).Scan(&roomID, &assetID, &title, &bodyMarkdown, &difficulty, &dockerImage, &exposedPortsRaw)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Task not found")
		return
	}

	status := "pending"
	var sessionID int64
	now := time.Now()
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO lab_sessions (user_id, room_id, task_id, status, created_at, updated_at, docker_image)
		VALUES ($1, $2, $3, $4, $5, $5, $6)
		RETURNING id
	`, u.ID, roomID, taskID, status, now, dockerImage).Scan(&sessionID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to create lab session")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to finalize lab session")
		return
	}

	image := "ubuntu:latest"
	if dockerImage != nil && strings.TrimSpace(*dockerImage) != "" {
		image = strings.TrimSpace(*dockerImage)
	}
	memoryMB := int64(512)
	networkName := fmt.Sprintf("xv-room-%d", sessionID)
	containerName := fmt.Sprintf("xv-task-%d", sessionID)

	containerID, containerIP, spawnErr := a.DockerSvc.SpawnContainerOnNetwork(c.Request.Context(), image, containerName, memoryMB, 512, networkName)
	if spawnErr != nil {
		_, _ = a.DB.Exec(c.Request.Context(), `
			UPDATE lab_sessions SET status='error', updated_at=$1 WHERE id=$2
		`, time.Now(), sessionID)
		writeErr(c, http.StatusInternalServerError, "Failed to start task lab session")
		return
	}

	exposedPorts := parseJSONStringArray(exposedPortsRaw)
	port := 80
	if len(exposedPorts) > 0 {
		p := strings.TrimSpace(exposedPorts[0])
		if i := strings.Index(p, "/"); i > 0 {
			p = p[:i]
		}
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			port = parsed
		}
	}

	if containerIP == "" {
		containerIP = "127.0.0.1"
	}

	maxDurationMin := a.Cfg.Lab.MaxSessionDuration * 60
	if maxDurationMin <= 0 {
		maxDurationMin = 240
	}
	startedAt := time.Now()
	expiresAt := startedAt.Add(time.Duration(maxDurationMin) * time.Minute)
	hostPort := a.DockerSvc.GetWebPort(c.Request.Context(), containerID)
	contextPath := ""
	if strings.Contains(strings.ToLower(image), "vulnerable-app") {
		contextPath = "/VulnerableApp"
	}
	hostURL := fmt.Sprintf("http://localhost:%d%s", hostPort, contextPath)
	if hostPort == 0 {
		hostURL = fmt.Sprintf("http://%s:%d%s", containerIP, port, contextPath)
	}
	connInfo := map[string]interface{}{
		"host":         "localhost",
		"ip":           containerIP,
		"port":         hostPort,
		"url":          hostURL,
		"hostUrl":      hostURL,
		"hostPort":     hostPort,
		"contextPath":  contextPath,
		"network_name": networkName,
	}

	_, _ = a.DB.Exec(c.Request.Context(), `
		UPDATE lab_sessions
		SET status='running', started_at=$1, expires_at=$2, network_name=$3,
			target_container_id=$4, connection_info_json=$5, updated_at=$1
		WHERE id=$6
	`, startedAt, expiresAt, networkName, containerID, marshalJSON(connInfo), sessionID)

	_ = title
	_ = difficulty
	_ = bodyMarkdown
	_ = assetID

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Task lab session started",
		"data": gin.H{
			"session": gin.H{
				"id":                sessionID,
				"userId":            u.ID,
				"roomId":            roomID,
				"taskId":            taskID,
				"status":            "running",
				"startedAt":         startedAt,
				"expiresAt":         expiresAt,
				"networkName":       networkName,
				"targetContainerId": containerID,
				"attackContainerId": nil,
				"hostUrl":           hostURL,
				"hostPort":          hostPort,
				"connectionInfo":    connInfo,
			},
		},
	})
}

func (a *API) GetLabSessionByID(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	id, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var (
		session           LabSessionView
		connectionInfoRaw []byte
		assetID           sql.NullInt64
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT s.id, s.user_id, s.room_id, s.task_id, s.status, s.started_at, s.expires_at,
			COALESCE(s.network_name,''), COALESCE(s.target_container_id,''),
			COALESCE(s.attack_container_id,''), s.connection_info_json,
			t.asset_id
		FROM lab_sessions s
		LEFT JOIN tasks t ON s.task_id = t.id
		WHERE s.id=$1
	`, id).Scan(
		&session.ID,
		&session.UserID,
		&session.RoomID,
		&session.TaskID,
		&session.Status,
		&session.StartedAt,
		&session.ExpiresAt,
		&session.NetworkName,
		&session.TargetContainerID,
		&session.AttackContainerID,
		&connectionInfoRaw,
		&assetID,
	)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Lab session not found")
		return
	}

	if u.Role == roleStudent && session.UserID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized to access this session")
		return
	}

	connMap := parseJSONMap(connectionInfoRaw)
	hostURL, _ := connMap["hostUrl"].(string)
	var hostPort int
	if p, ok := connMap["hostPort"].(float64); ok {
		hostPort = int(p)
	} else if p, ok := connMap["port"].(float64); ok {
		hostPort = int(p)
	}

	if (hostPort == 0 || hostURL == "") && session.TargetContainerID != "" {
		if p := a.DockerSvc.GetWebPort(c.Request.Context(), session.TargetContainerID); p > 0 {
			hostPort = p
			var dockerImg string
			_ = a.DB.QueryRow(c.Request.Context(), `SELECT COALESCE(docker_image,'') FROM lab_sessions WHERE id=$1`, session.ID).Scan(&dockerImg)
			contextPath := ""
			if strings.Contains(strings.ToLower(dockerImg), "vulnerable-app") {
				contextPath = "/VulnerableApp"
			}
			hostURL = fmt.Sprintf("http://localhost:%d%s", hostPort, contextPath)
			if connMap == nil {
				connMap = make(map[string]interface{})
			}
			connMap["hostPort"] = hostPort
			connMap["port"] = hostPort
			connMap["hostUrl"] = hostURL
			connMap["url"] = hostURL
			connMap["contextPath"] = contextPath
			_, _ = a.DB.Exec(c.Request.Context(), `UPDATE lab_sessions SET connection_info_json=$1 WHERE id=$2`, marshalJSON(connMap), session.ID)
		}
	}
	session.ConnectionInfo = connMap

	sessionPayload := gin.H{
		"id":                session.ID,
		"status":            strings.ToUpper(session.Status),
		"roomId":            session.RoomID,
		"taskId":            session.TaskID,
		"startedAt":         session.StartedAt,
		"expiresAt":         session.ExpiresAt,
		"publicIp":          connectionHost(session.ConnectionInfo),
		"containerId":       session.TargetContainerID,
		"targetContainerId": session.TargetContainerID,
		"networkName":       session.NetworkName,
		"connectionInfo":    session.ConnectionInfo,
		"hostUrl":           hostURL,
		"hostPort":          hostPort,
	}
	if assetID.Valid {
		sessionPayload["lab"] = assetID.Int64
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"session": sessionPayload}})
}