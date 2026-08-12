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

func (a *API) GetAllLabs(c *gin.Context) {
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT id, name, COALESCE(source_ref,''), COALESCE(docker_image,''), is_active
		FROM assets
		WHERE is_active=true
		ORDER BY id DESC
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch labs")
		return
	}
	defer rows.Close()

	labs := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var name, sourceRef, image string
		var active bool
		if err := rows.Scan(&id, &name, &sourceRef, &image, &active); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode labs")
			return
		}
		labs = append(labs, gin.H{
			"id":                id,
			"title":             name,
			"description":       sourceRef,
			"difficulty":        "Easy",
			"category":          "Red Team",
			"estimatedDuration": 60,
			"isActive":          active,
			"isPublished":       true,
			"dockerImage":       image,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"labs": labs}})
}

func (a *API) GetLabByID(c *gin.Context) {
	labID, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var (
		id              int64
		name            string
		sourceType      string
		sourceRef       string
		image           string
		exposedPortsRaw []byte
		envRaw          []byte
		active          bool
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id, name, source_type, COALESCE(source_ref,''), docker_image,
			exposed_ports_json, env_json, is_active
		FROM assets
		WHERE id=$1
	`, labID).Scan(&id, &name, &sourceType, &sourceRef, &image, &exposedPortsRaw, &envRaw, &active)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Lab not found")
		return
	}

	// Fetch task and room documentation if associated with this asset
	var roomDesc, taskBody, taskPrompt string
	var hintsRaw []byte
	_ = a.DB.QueryRow(c.Request.Context(), `
		SELECT COALESCE(r.description, ''), COALESCE(t.body_markdown, ''), COALESCE(t.prompt, ''), COALESCE(t.hints_json, '[]'::jsonb)
		FROM tasks t
		LEFT JOIN rooms r ON r.id = t.room_id
		WHERE t.asset_id = $1
		LIMIT 1
	`, id).Scan(&roomDesc, &taskBody, &taskPrompt, &hintsRaw)

	desc := roomDesc
	if desc == "" {
		desc = "Penetration testing lab environment for hands-on cybersecurity training."
	}
	instructions := taskBody
	if instructions == "" {
		instructions = "Connect to the lab terminal on the left and locate the hidden flag."
	}

	objectives := []string{}
	if taskPrompt != "" {
		objectives = append(objectives, taskPrompt)
	} else {
		objectives = append(objectives, "Exploit the target vulnerability and obtain the flag.")
	}

	hints := parseJSONStringArray(hintsRaw)

	lab := gin.H{
		"id":                id,
		"title":             name,
		"description":       desc,
		"difficulty":        "Easy",
		"category":          "Red Team",
		"estimatedDuration": 60,
		"objectives":        objectives,
		"instructions":      instructions,
		"hints":             hints,
		"tools":             []string{"nmap", "curl", "sqlmap"},
		"tags":              []string{"web", "security"},
		"isActive":          active,
		"isPublished":       true,
		"dockerImage":       image,
		"sourceType":        sourceType,
		"sourceRef":         sourceRef,
		"exposedPorts":      parseJSONStringArray(exposedPortsRaw),
		"env":               parseJSONMap(envRaw),
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"lab": lab}})
}

func (a *API) StartLab(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	var body struct {
		LabID int64 `json:"labId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Lab ID is required")
		return
	}

	var assetName, image string
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT name, docker_image FROM assets WHERE id=$1 AND is_active=true
	`, body.LabID).Scan(&assetName, &image)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Lab not found")
		return
	}

	var existing int64
	if err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id FROM lab_sessions
		WHERE user_id=$1 AND status IN ('pending','initializing','running')
		LIMIT 1
	`, u.ID).Scan(&existing); err == nil {
		writeErr(c, http.StatusBadRequest, "You already have an active lab session")
		return
	}

	var roomID, taskID sql.NullInt64
	_ = a.DB.QueryRow(c.Request.Context(), `
		SELECT room_id, id FROM tasks WHERE asset_id=$1 LIMIT 1
	`, body.LabID).Scan(&roomID, &taskID)

	var sessionID int64
	now := time.Now()
	err = a.DB.QueryRow(c.Request.Context(), `
		INSERT INTO lab_sessions (user_id, status, created_at, updated_at, docker_image, room_id, task_id)
		VALUES ($1, 'initializing', $2, $2, $3, $4, $5)
		RETURNING id
	`, u.ID, now, image, roomID, taskID).Scan(&sessionID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to create session")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Provisioning cloud environment...",
		"data": gin.H{
			"session": gin.H{"id": sessionID, "status": "INITIALIZING", "labName": assetName, "lab": body.LabID},
		},
	})
}

func (a *API) CompleteProvisioning(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	sessionID, ok := parseInt64Param(c, "sessionId")
	if !ok {
		return
	}

	var userID int64
	var status, image string
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT user_id, status, COALESCE(docker_image,'ubuntu:latest')
		FROM lab_sessions WHERE id=$1
	`, sessionID).Scan(&userID, &status, &image)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Session not found")
		return
	}
	if userID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized")
		return
	}
	if status != "initializing" {
		writeErr(c, http.StatusBadRequest, "Session is not in initializing state")
		return
	}

	networkName := fmt.Sprintf("xv-room-%d", sessionID)
	containerName := fmt.Sprintf("xv-lab-%d", sessionID)
	containerID, containerIP, spawnErr := a.DockerSvc.SpawnContainerOnNetwork(c.Request.Context(), image, containerName, 512, 512, networkName)
	if spawnErr != nil {
		_, _ = a.DB.Exec(c.Request.Context(), `UPDATE lab_sessions SET status='error', updated_at=$1 WHERE id=$2`, time.Now(), sessionID)
		writeErr(c, http.StatusInternalServerError, "Failed to start lab container")
		return
	}
	if containerIP == "" {
		containerIP = "127.0.0.1"
	}

	now := time.Now()
	expiresAt := now.Add(240 * time.Minute)
	conn := map[string]interface{}{"host": containerIP, "ip": containerIP, "port": 80, "url": fmt.Sprintf("http://%s:80", containerIP)}
	_, _ = a.DB.Exec(c.Request.Context(), `
		UPDATE lab_sessions
		SET status='running', started_at=$1, expires_at=$2, network_name=$3,
			target_container_id=$4, connection_info_json=$5, updated_at=$1
		WHERE id=$6
	`, now, expiresAt, networkName, containerID, marshalJSON(conn), sessionID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab environment is now active!",
		"data": gin.H{
			"session": gin.H{
				"id":          sessionID,
				"status":      "RUNNING",
				"publicIp":    containerIP,
				"startedAt":   now,
				"expiresAt":   expiresAt,
				"containerId": containerID,
			},
		},
	})
}

func (a *API) StopLab(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	var body struct {
		SessionID int64 `json:"sessionId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Session ID is required")
		return
	}

	var userID int64
	var status string
	var containerID, networkName string
	var startedAt *time.Time
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT user_id, status, COALESCE(target_container_id,''), COALESCE(network_name,''), started_at
		FROM lab_sessions WHERE id=$1
	`, body.SessionID).Scan(&userID, &status, &containerID, &networkName, &startedAt)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Session not found")
		return
	}
	if userID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized")
		return
	}

	if containerID != "" {
		_ = a.DockerSvc.StopContainer(c.Request.Context(), containerID)
	}
	if networkName != "" {
		_ = a.DockerSvc.RemoveNetwork(c.Request.Context(), networkName)
	}

	now := time.Now()
	_, _ = a.DB.Exec(c.Request.Context(), `
		UPDATE lab_sessions SET status='stopped', updated_at=$1 WHERE id=$2
	`, now, body.SessionID)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Lab session stopped successfully"})
}

func (a *API) GetActiveSession(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var (
		id                             int64
		status                         string
		roomID, taskID                 *int64
		targetContainerID, networkName string
		startedAt, expiresAt           *time.Time
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id, status, room_id, task_id, COALESCE(target_container_id,''), COALESCE(network_name,''), started_at, expires_at
		FROM lab_sessions
		WHERE user_id=$1 AND status IN ('pending','initializing','running')
		ORDER BY created_at DESC
		LIMIT 1
	`, u.ID).Scan(&id, &status, &roomID, &taskID, &targetContainerID, &networkName, &startedAt, &expiresAt)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id":          id,
		"status":      strings.ToUpper(status),
		"roomId":      roomID,
		"taskId":      taskID,
		"containerId": targetContainerID,
		"networkName": networkName,
		"startedAt":   startedAt,
		"expiresAt":   expiresAt,
	}})
}

func (a *API) GetLegacySessionStatus(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	sessionID, ok := parseInt64Param(c, "sessionId")
	if !ok {
		return
	}
	var (
		id, userID int64
		status     string
	)
	err := a.DB.QueryRow(c.Request.Context(), `SELECT id, user_id, status FROM lab_sessions WHERE id=$1`, sessionID).Scan(&id, &userID, &status)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Session not found")
		return
	}
	if userID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"session": gin.H{"id": id, "status": strings.ToUpper(status)}}})
}

func (a *API) GetActiveLabSession(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var (
		session           LabSessionView
		connectionInfoRaw []byte
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id, user_id, room_id, task_id, status, started_at, expires_at,
			COALESCE(network_name,''), COALESCE(target_container_id,''),
			COALESCE(attack_container_id,''), connection_info_json
		FROM lab_sessions
		WHERE user_id=$1 AND status IN ('pending','initializing','running')
		ORDER BY created_at DESC
		LIMIT 1
	`, u.ID).Scan(
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
	)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"session": nil}})
		return
	}

	session.ConnectionInfo = parseJSONMap(connectionInfoRaw)
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
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"session": sessionPayload}})
}

func (a *API) TerminateLabSession(c *gin.Context) {
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
		userID      int64
		status      string
		containerID string
		networkName string
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT user_id, status, COALESCE(target_container_id,''), COALESCE(network_name,'')
		FROM lab_sessions
		WHERE id=$1
	`, id).Scan(&userID, &status, &containerID, &networkName)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Lab session not found")
		return
	}

	if u.Role == roleStudent && userID != u.ID {
		writeErr(c, http.StatusForbidden, "Not authorized to terminate this session")
		return
	}

	if containerID != "" {
		_ = a.DockerSvc.StopContainer(c.Request.Context(), containerID)
	}
	if networkName != "" {
		_ = a.DockerSvc.RemoveNetwork(c.Request.Context(), networkName)
	}

	now := time.Now()
	if _, err := a.DB.Exec(c.Request.Context(), `
		UPDATE lab_sessions
		SET status='terminated', updated_at=$1
		WHERE id=$2
	`, now, id); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to terminate lab session")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab session terminated successfully",
		"data":    gin.H{"id": id, "status": "TERMINATED"},
	})
}

func (a *API) GetLabSessions(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	limit := int64(10)
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	orderBy := "created_at DESC"
	if c.Query("sort") == "createdAt" {
		orderBy = "created_at ASC"
	}

	query := fmt.Sprintf(`
		SELECT id, status, started_at, expires_at, created_at
		FROM lab_sessions
		WHERE user_id=$1
		ORDER BY %s
		LIMIT $2
	`, orderBy)

	rows, err := a.DB.Query(c.Request.Context(), query, u.ID, limit)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch sessions")
		return
	}
	defer rows.Close()

	sessions := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var status string
		var startedAt, expiresAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &status, &startedAt, &expiresAt, &createdAt); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode sessions")
			return
		}
		sessions = append(sessions, gin.H{
			"id":        id,
			"status":    strings.ToUpper(status),
			"startedAt": startedAt,
			"expiresAt": expiresAt,
			"createdAt": createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"sessions": sessions}})
}