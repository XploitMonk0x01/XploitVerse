package pgapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/services"
)

// adminLabMeta is the metadata an administrator supplies for a new Docker lab.
type adminLabMeta struct {
	Title       string   `json:"title"`
	Slug        string   `json:"slug"`
	Description string   `json:"description"`
	Difficulty  string   `json:"difficulty"`
	Category    string   `json:"category"`
	DockerImage string   `json:"dockerImage"`
	Ports       []string `json:"ports"`
	Flag        string   `json:"flag"`
	Points      int64    `json:"points"`
	HintPenalty int64    `json:"hintPenalty"`
	TaskTitle   string   `json:"taskTitle"`
	TaskBody    string   `json:"taskBody"`
	TaskPrompt  string   `json:"taskPrompt"`
	Hints       []string `json:"hints"`
	BuildNow    bool     `json:"buildNow"`
}

// parsedLabRequest is the normalized form of an admin lab submission, regardless
// of whether it arrived as JSON or multipart/form-data.
type parsedLabRequest struct {
	meta       adminLabMeta
	dockerfile string
	files      map[string][]byte
}

var labPortRe = regexp.MustCompile(`^\d{1,5}(/(tcp|udp))?$`)

// AdminCreateLab accepts a pasted/uploaded Dockerfile plus supporting challenge
// files, writes them to challenges/<slug>/, and registers the lab in PostgreSQL.
// Once registered the lab is live and available to students.
func (a *API) AdminCreateLab(c *gin.Context) {
	req, err := parseAdminLabRequest(c)
	if err != nil {
		writeErr(c, http.StatusBadRequest, err.Error())
		return
	}

	ctx := c.Request.Context()
	meta := req.meta

	title := strings.TrimSpace(meta.Title)
	if title == "" {
		writeErr(c, http.StatusBadRequest, "Lab title is required")
		return
	}

	slug := strings.ToLower(strings.TrimSpace(meta.Slug))
	if slug == "" {
		slug = services.SlugifyLabName(title)
	}
	if err := services.ValidateLabSlug(slug); err != nil {
		writeErr(c, http.StatusBadRequest, err.Error())
		return
	}

	// Reject duplicate slugs before touching disk or the database.
	var existingID int64
	if err := a.DB.QueryRow(ctx, `SELECT id FROM rooms WHERE slug = $1 LIMIT 1`, slug).Scan(&existingID); err == nil {
		writeErr(c, http.StatusConflict, "A lab with slug '"+slug+"' already exists")
		return
	}

	dockerfile := strings.TrimSpace(req.dockerfile)
	if dockerfile == "" {
		for path, content := range req.files {
			if strings.EqualFold(filepath.Base(path), "Dockerfile") {
				dockerfile = strings.TrimSpace(string(content))
				break
			}
		}
	}
	if dockerfile == "" {
		writeErr(c, http.StatusBadRequest, "A Dockerfile is required (paste one or upload a Dockerfile file)")
		return
	}
	if !strings.Contains(strings.ToUpper(dockerfile), "FROM ") {
		writeErr(c, http.StatusBadRequest, "Dockerfile is invalid: a FROM instruction is required")
		return
	}

	if req.files == nil {
		req.files = map[string][]byte{}
	}
	// Normalize the Dockerfile to the context root and guarantee the canonical
	// challenge flag file exists at /flag.txt inside the image.
	for path := range req.files {
		if strings.EqualFold(filepath.Base(path), "Dockerfile") && path != "Dockerfile" {
			delete(req.files, path)
		}
	}
	req.files["Dockerfile"] = []byte(strings.TrimRight(dockerfile, "\n") + "\n")

	flag := strings.TrimSpace(meta.Flag)
	if flag == "" {
		flag = "FLAG{xv_" + strings.ReplaceAll(slug, "-", "_") + "}"
	}
	if _, ok := req.files["flag.txt"]; !ok {
		req.files["flag.txt"] = []byte(flag + "\n")
	}
	// Mark the directory as admin-authored so deletion only ever removes labs
	// created here, never the built-in challenge sources.
	req.files[services.ManagedLabMarker] = []byte("managed by the XploitVerse admin panel\n")

	difficulty := normalizeLabDifficulty(meta.Difficulty)
	category := strings.TrimSpace(meta.Category)
	if category == "" {
		category = "Web Exploitation"
	}
	description := strings.TrimSpace(meta.Description)
	if description == "" {
		description = title + " — hands-on Docker challenge."
	}

	ports := normalizeLabPorts(meta.Ports)

	image := strings.TrimSpace(meta.DockerImage)
	if image == "" {
		image = "xploitverse/" + slug + ":latest"
	}
	sourceRef := "challenges/" + slug

	taskTitle := strings.TrimSpace(meta.TaskTitle)
	if taskTitle == "" {
		taskTitle = "Find the Flag"
	}
	taskBody := strings.TrimSpace(meta.TaskBody)
	if taskBody == "" {
		taskBody = "# " + title + "\n\nExploit the vulnerabilities in this lab to recover the hidden flag."
	}
	taskPrompt := strings.TrimSpace(meta.TaskPrompt)
	if taskPrompt == "" {
		taskPrompt = "Submit the flag."
	}
	hints := meta.Hints
	if len(hints) == 0 {
		hints = []string{"Enumerate all exposed services", "Inspect the source files for weaknesses"}
	}

	points := meta.Points
	if points <= 0 {
		points = 100
	}
	hintPenalty := meta.HintPenalty
	if hintPenalty <= 0 {
		hintPenalty = 25
	}

	portsJSON, _ := json.Marshal(ports)
	hintsJSON, _ := json.Marshal(hints)

	if _, err := services.WriteLabSource(slug, req.files); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to write lab files: "+err.Error())
		return
	}

	flagHash := hashSHA256(flag)

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to start database transaction")
		return
	}
	defer tx.Rollback(ctx)

	var assetID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
		VALUES ($1, 'custom', $2, $3, $2, $4::jsonb, '{}'::jsonb, 'target', true)
		RETURNING id
	`, title, sourceRef, image, string(portsJSON)).Scan(&assetID); err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to create lab asset: "+err.Error())
		return
	}

	var roomID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO rooms (slug, title, description, difficulty, is_public, created_by)
		VALUES ($1, $2, $3, $4, true, $5)
		RETURNING id
	`, slug, title, description, difficulty, adminID(c)).Scan(&roomID); err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to create lab room: "+err.Error())
		return
	}

	var moduleID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
		VALUES ($1, $2, $3, 1, $4, true)
		RETURNING id
	`, roomID, "Challenge Module", description, points).Scan(&moduleID); err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to create lab module: "+err.Error())
		return
	}

	var taskID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
		VALUES ($1, $2, $3, $4, 'flag', 'string', $5, $6, $7::jsonb, 1, $8, $9, $10, true)
		RETURNING id
	`, roomID, moduleID, assetID, taskTitle, taskBody, taskPrompt, string(hintsJSON), points, hintPenalty, flagHash).Scan(&taskID); err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to create lab task: "+err.Error())
		return
	}

	if err := tx.Commit(ctx); err != nil {
		_ = services.RemoveLabSource(slug)
		writeErr(c, http.StatusInternalServerError, "Failed to persist lab: "+err.Error())
		return
	}

	buildStatus := "pending"
	buildError := ""
	if meta.BuildNow {
		if err := a.DockerSvc.BuildImage(ctx, sourceRef, image); err != nil {
			buildStatus = "failed"
			buildError = err.Error()
		} else {
			buildStatus = "ready"
		}
	}

	message := "Lab created and now live."
	if buildStatus == "failed" {
		message = "Lab created, but the Docker image failed to build. Retry the build from the lab list."
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"lab": gin.H{
				"id":               assetID,
				"slug":             slug,
				"title":            title,
				"description":      description,
				"difficulty":       difficulty,
				"category":         category,
				"dockerImage":      image,
				"sourceRef":        sourceRef,
				"buildContextPath": sourceRef,
				"exposedPorts":     ports,
				"flag":             flag,
				"points":           points,
				"hintPenalty":      hintPenalty,
				"taskId":           taskID,
				"roomId":           roomID,
				"moduleId":         moduleID,
				"isActive":         true,
			},
			"buildStatus":     buildStatus,
			"buildError":      buildError,
			"dockerAvailable": a.DockerSvc.Available(),
		},
	})
}

// AdminListLabs returns every registered lab, including inactive ones, for the
// admin control panel.
func (a *API) AdminListLabs(c *gin.Context) {
	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT DISTINCT ON (a.id)
			a.id, a.name, COALESCE(a.source_ref,''), a.docker_image,
			COALESCE(a.build_context_path,''), a.exposed_ports_json, a.is_active, a.created_at,
			COALESCE(r.slug,''), COALESCE(r.description,''), COALESCE(r.difficulty,'Easy'),
			(SELECT COUNT(*) FROM tasks t2 WHERE t2.asset_id = a.id)
		FROM assets a
		LEFT JOIN tasks t ON t.asset_id = a.id
		LEFT JOIN rooms r ON r.id = t.room_id
		ORDER BY a.id DESC, t.id
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch labs")
		return
	}
	defer rows.Close()

	labs := make([]gin.H, 0)
	for rows.Next() {
		var (
			id              int64
			name, sourceRef string
			image, buildCtx string
			portsRaw        []byte
			active          bool
			createdAt       time.Time
			slug, desc, dif string
			taskCount       int64
		)
		if err := rows.Scan(&id, &name, &sourceRef, &image, &buildCtx, &portsRaw, &active, &createdAt,
			&slug, &desc, &dif, &taskCount); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode labs")
			return
		}
		labs = append(labs, gin.H{
			"id":               id,
			"slug":             slug,
			"title":            name,
			"description":      desc,
			"difficulty":       dif,
			"dockerImage":      image,
			"sourceRef":        sourceRef,
			"buildContextPath": buildCtx,
			"exposedPorts":     parseJSONStringArray(portsRaw),
			"isActive":         active,
			"taskCount":        taskCount,
			"createdAt":        createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"labs":            labs,
		"dockerAvailable": a.DockerSvc.Available(),
	}})
}

// AdminBuildLab rebuilds the Docker image for an existing lab.
func (a *API) AdminBuildLab(c *gin.Context) {
	id, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	var image, buildPath string
	if err := a.DB.QueryRow(c.Request.Context(), `
		SELECT docker_image, COALESCE(build_context_path,'')
		FROM assets WHERE id = $1
	`, id).Scan(&image, &buildPath); err != nil {
		writeErr(c, http.StatusNotFound, "Lab not found")
		return
	}
	if strings.TrimSpace(buildPath) == "" {
		writeErr(c, http.StatusBadRequest, "This lab has no build context to compile")
		return
	}

	if err := a.DockerSvc.BuildImage(c.Request.Context(), buildPath, image); err != nil {
		writeErr(c, http.StatusInternalServerError, "Docker build failed: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Docker image rebuilt successfully.",
		"data": gin.H{
			"id":               id,
			"dockerImage":      image,
			"buildContextPath": buildPath,
			"buildStatus":      "ready",
		},
	})
}

// AdminDeleteLab removes a lab's database records, active sessions, and source
// directory.
func (a *API) AdminDeleteLab(c *gin.Context) {
	id, ok := parseInt64Param(c, "id")
	if !ok {
		return
	}

	ctx := c.Request.Context()

	var sourceRef string
	if err := a.DB.QueryRow(ctx, `SELECT COALESCE(source_ref,'') FROM assets WHERE id = $1`, id).Scan(&sourceRef); err != nil {
		writeErr(c, http.StatusNotFound, "Lab not found")
		return
	}

	// Collect active containers so they can be torn down after the DB commit.
	containerRows, err := a.DB.Query(ctx, `
		SELECT COALESCE(target_container_id,''), COALESCE(network_name,'')
		FROM lab_sessions
		WHERE status IN ('pending','initializing','running')
			AND task_id IN (SELECT id FROM tasks WHERE asset_id = $1)
	`, id)
	containers := make([][2]string, 0)
	if err == nil {
		for containerRows.Next() {
			var cid, net string
			if scanErr := containerRows.Scan(&cid, &net); scanErr == nil {
				containers = append(containers, [2]string{cid, net})
			}
		}
		containerRows.Close()
	}

	tx, err := a.DB.Begin(ctx)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to start database transaction")
		return
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE lab_sessions SET status='terminated', updated_at=now()
		WHERE status IN ('pending','initializing','running')
			AND task_id IN (SELECT id FROM tasks WHERE asset_id = $1)
	`, id); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to terminate lab sessions")
		return
	}

	// Capture the rooms this asset belongs to before removing its tasks.
	roomRows, err := tx.Query(ctx, `SELECT DISTINCT room_id FROM tasks WHERE asset_id = $1 AND room_id IS NOT NULL`, id)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to resolve lab rooms")
		return
	}
	roomIDs := make([]int64, 0)
	for roomRows.Next() {
		var roomID int64
		if scanErr := roomRows.Scan(&roomID); scanErr == nil {
			roomIDs = append(roomIDs, roomID)
		}
	}
	roomRows.Close()

	if _, err := tx.Exec(ctx, `DELETE FROM tasks WHERE asset_id = $1`, id); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to delete lab tasks")
		return
	}

	// Only remove rooms that no longer hold any tasks, so shared rooms survive.
	for _, roomID := range roomIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM rooms
			WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM tasks WHERE room_id = rooms.id)
		`, roomID); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to delete lab room")
			return
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM assets WHERE id = $1`, id); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to delete lab asset")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to delete lab")
		return
	}

	for _, ctr := range containers {
		if ctr[0] != "" {
			_ = a.DockerSvc.StopContainer(ctx, ctr[0])
		}
		if ctr[1] != "" {
			_ = a.DockerSvc.RemoveNetwork(ctx, ctr[1])
		}
	}

	if strings.HasPrefix(sourceRef, "challenges/") {
		slug := filepath.Base(sourceRef)
		// Only remove directories authored through the admin panel; built-in
		// challenge sources stay on disk.
		if services.IsManagedLabSource(slug) {
			_ = services.RemoveLabSource(slug)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Lab deleted.",
		"data":    gin.H{"id": id},
	})
}

// AdminValidateDockerfile performs lightweight, non-authoritative validation of a
// pasted Dockerfile so the admin gets fast feedback before submission.
func (a *API) AdminValidateDockerfile(c *gin.Context) {
	var body struct {
		Dockerfile string `json:"dockerfile"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "A Dockerfile payload is required")
		return
	}

	dockerfile := strings.TrimSpace(body.Dockerfile)
	issues := make([]string, 0)
	if dockerfile == "" {
		issues = append(issues, "Dockerfile is empty")
	} else {
		if !strings.Contains(strings.ToUpper(dockerfile), "FROM ") {
			issues = append(issues, "Missing a FROM instruction")
		}
		if !strings.Contains(strings.ToUpper(dockerfile), "EXPOSE ") {
			issues = append(issues, "No EXPOSE directive — the lab may not publish a web port")
		}
		if !strings.Contains(dockerfile, "flag.txt") {
			issues = append(issues, "A flag.txt is not referenced — the canonical flag is written automatically, make sure the image copies it")
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"valid":  len(issues) == 0,
			"issues": issues,
		},
	})
}

// ── Request parsing ──────────────────────────────────────────────────────────

func parseAdminLabRequest(c *gin.Context) (*parsedLabRequest, error) {
	if strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data") {
		return parseMultipartLab(c)
	}

	var envelope map[string]json.RawMessage
	if err := c.ShouldBindJSON(&envelope); err != nil {
		return nil, fmt.Errorf("invalid request body: %w", err)
	}
	return parseJSONLab(envelope)
}

func parseJSONLab(envelope map[string]json.RawMessage) (*parsedLabRequest, error) {
	req := &parsedLabRequest{files: map[string][]byte{}}

	metaRaw := json.RawMessage(nil)
	if v, ok := envelope["metadata"]; ok {
		metaRaw = v
	} else {
		// Also accept flat metadata fields at the top level.
		flat, _ := json.Marshal(rawMessagesToMap(envelope))
		metaRaw = flat
	}
	if err := json.Unmarshal(metaRaw, &req.meta); err != nil {
		return nil, fmt.Errorf("invalid metadata: %w", err)
	}

	if v, ok := envelope["dockerfile"]; ok {
		_ = json.Unmarshal(v, &req.dockerfile)
	}

	if v, ok := envelope["files"]; ok {
		var files map[string]string
		if err := json.Unmarshal(v, &files); err != nil {
			return nil, fmt.Errorf("invalid files map: %w", err)
		}
		for path, content := range files {
			clean, err := services.SafeRelPath(path)
			if err != nil {
				return nil, err
			}
			req.files[clean] = []byte(content)
		}
	}

	if v, ok := envelope["base64Files"]; ok {
		var files map[string]string
		if err := json.Unmarshal(v, &files); err != nil {
			return nil, fmt.Errorf("invalid base64Files map: %w", err)
		}
		for path, encoded := range files {
			clean, err := services.SafeRelPath(path)
			if err != nil {
				return nil, err
			}
			decoded, err := base64.StdEncoding.DecodeString(encoded)
			if err != nil {
				return nil, fmt.Errorf("invalid base64 content for %s", path)
			}
			req.files[clean] = decoded
		}
	}

	return req, nil
}

func parseMultipartLab(c *gin.Context) (*parsedLabRequest, error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, fmt.Errorf("invalid multipart form: %w", err)
	}

	req := &parsedLabRequest{files: map[string][]byte{}}

	if raw := firstFormValue(form.Value, "metadata"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req.meta); err != nil {
			return nil, fmt.Errorf("invalid metadata JSON: %w", err)
		}
	}
	if v := firstFormValue(form.Value, "dockerfile"); v != "" {
		req.dockerfile = v
	}

	paths := parsePathOverrides(form.Value["paths"])
	headers := form.File["files"]
	for i, header := range headers {
		content, err := readMultipartFile(header)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %w", header.Filename, err)
		}
		rel := header.Filename
		if i < len(paths) && strings.TrimSpace(paths[i]) != "" {
			rel = paths[i]
		}
		clean, err := services.SafeRelPath(rel)
		if err != nil {
			return nil, err
		}
		req.files[clean] = content
	}

	// A dedicated Dockerfile part takes precedence over pasted content.
	if dfHeaders := form.File["dockerfile"]; len(dfHeaders) > 0 {
		content, err := readMultipartFile(dfHeaders[0])
		if err != nil {
			return nil, fmt.Errorf("failed to read Dockerfile: %w", err)
		}
		req.dockerfile = string(content)
	}

	return req, nil
}

func firstFormValue(values map[string][]string, key string) string {
	if vals, ok := values[key]; ok && len(vals) > 0 {
		return vals[0]
	}
	return ""
}

func parsePathOverrides(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}
	var paths []string
	if err := json.Unmarshal([]byte(raw[0]), &paths); err != nil {
		return nil
	}
	return paths
}

func readMultipartFile(header *multipart.FileHeader) ([]byte, error) {
	f, err := header.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	// Cap individual lab files at 16 MiB to avoid runaway memory use.
	return io.ReadAll(io.LimitReader(f, 16<<20))
}

func rawMessagesToMap(envelope map[string]json.RawMessage) map[string]json.RawMessage {
	out := make(map[string]json.RawMessage, len(envelope))
	for k, v := range envelope {
		out[k] = v
	}
	return out
}

func adminID(c *gin.Context) interface{} {
	if u := getAuthUser(c); u != nil {
		return u.ID
	}
	return nil
}

// ── Normalization helpers ────────────────────────────────────────────────────

func normalizeLabDifficulty(v string) string {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "hard":
		return "Hard"
	case "medium":
		return "Medium"
	default:
		return "Easy"
	}
}

func normalizeLabPorts(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, p := range in {
		p = strings.ToLower(strings.TrimSpace(p))
		if p == "" || !labPortRe.MatchString(p) {
			continue
		}
		if !strings.Contains(p, "/") {
			p += "/tcp"
		}
		if !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		out = []string{"22/tcp", "5000/tcp"}
	}
	return out
}
