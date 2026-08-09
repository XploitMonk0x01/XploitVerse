package pgapi

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xploitverse/backend/internal/config"
	baseMiddleware "github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/services"
	"github.com/xploitverse/backend/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

// API is the PostgreSQL-backed HTTP API implementation.
type API struct {
	DB        *pgxpool.Pool
	Cfg       *config.Config
	DockerSvc *services.DockerService
	RedisSvc  *services.RedisService
}

// RegisterRoutes wires PostgreSQL-first routes according to new.md while
// preserving existing client contract endpoints.
func RegisterRoutes(r *gin.Engine, db *pgxpool.Pool, cfg *config.Config, dockerSvc *services.DockerService, redisSvc *services.RedisService) {
	api := &API{DB: db, Cfg: cfg, DockerSvc: dockerSvc, RedisSvc: redisSvc}
	auth := VerifyToken(cfg, db)
	authLimiter := baseMiddleware.NewRateLimiter(10, 15*time.Minute)

	v1 := r.Group("/api")

	authGroup := v1.Group("/auth")
	{
		authGroup.POST("/register", authLimiter.Middleware(), api.Register)
		authGroup.POST("/login", authLimiter.Middleware(), api.Login)
		authGroup.POST("/logout", api.Logout)
		authGroup.GET("/me", auth, api.GetMe)
		authGroup.PUT("/update-password", auth, api.UpdatePassword)
		authGroup.POST("/refresh-token", auth, api.RefreshToken)
		authGroup.POST("/forgot-password", authLimiter.Middleware(), api.ForgotPassword)
		authGroup.POST("/reset-password/:token", authLimiter.Middleware(), api.ResetPassword)
	}

	usersGroup := v1.Group("/users")
	usersGroup.Use(auth)
	{
		usersGroup.GET("/me/progress", api.GetMyProgress)
	}

	coursesGroup := v1.Group("/courses")
	{
		coursesGroup.GET("", api.GetCourses)
		coursesGroup.GET("/:slug", api.GetCourseBySlug)
	}

	modulesGroup := v1.Group("/modules")
	{
		modulesGroup.GET("/:id", api.GetModuleByID)
	}

	tasksGroup := v1.Group("/tasks")
	{
		tasksGroup.GET("/:id", api.GetTaskByID)
		tasksGroup.POST("/:task_id/lab-sessions", auth, api.StartTaskLabSession)
		tasksGroup.POST("/:task_id/submit-flag", auth, api.SubmitTaskFlag)
	}

	roomsGroup := v1.Group("/rooms")
	{
		roomsGroup.GET("", api.GetRooms)
		roomsGroup.GET("/:id", api.GetRoomByID)
		roomsGroup.GET("/:id/tasks", api.GetRoomTasks)
	}

	labSessionsGroup := v1.Group("/lab-sessions")
	labSessionsGroup.Use(auth)
	{
		labSessionsGroup.GET("", api.GetLabSessions)
		labSessionsGroup.GET("/active", api.GetActiveLabSession)
		labSessionsGroup.GET("/:id", api.GetLabSessionByID)
		labSessionsGroup.POST("/:id/terminate", api.TerminateLabSession)
	}

	flagsGroup := v1.Group("/flags")
	flagsGroup.Use(auth)
	{
		flagsGroup.POST("/submit", api.SubmitFlag)
	}

	lbGroup := v1.Group("/leaderboard")
	{
		lbGroup.GET("", api.GetLeaderboard)
		lbGroup.GET("/me", auth, api.GetMyRank)
	}

	// Legacy dashboard-compatible lab endpoints.
	labsGroup := v1.Group("/labs")
	{
		labsGroup.GET("", api.GetAllLabs)
		labsGroup.GET("/:id", api.GetLabByID)
		labsGroup.Use(auth)
		labsGroup.POST("/start", api.StartLab)
		labsGroup.POST("/stop", api.StopLab)
		labsGroup.GET("/active-session", api.GetActiveSession)
		labsGroup.GET("/session/:sessionId/status", api.GetLegacySessionStatus)
		labsGroup.POST("/session/:sessionId/provision", api.CompleteProvisioning)
	}
}

func writeErr(c *gin.Context, code int, message string) {
	c.AbortWithStatusJSON(code, gin.H{
		"success": false,
		"message": message,
	})
}

func hashSHA256(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}

func parseInt64Param(c *gin.Context, name string) (int64, bool) {
	v := strings.TrimSpace(c.Param(name))
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		writeErr(c, http.StatusBadRequest, "Invalid parameter: "+name)
		return 0, false
	}
	return n, true
}

func pgUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func parseJSONStringArray(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil {
		return []string{}
	}
	return out
}

func parseJSONMap(raw []byte) map[string]interface{} {
	out := map[string]interface{}{}
	if len(raw) == 0 {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	return out
}

func marshalJSON(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func connectionHost(info interface{}) string {
	var m map[string]interface{}
	switch v := info.(type) {
	case map[string]interface{}:
		m = v
	case nil:
		return ""
	default:
		return ""
	}

	if v, ok := m["ip"].(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	if v, ok := m["host"].(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return ""
}

func (a *API) Register(c *gin.Context) {
	var body struct {
		Username  string `json:"username" binding:"required,min=3,max=30"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=8"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	var id int64
	err = a.DB.QueryRow(c.Request.Context(), `
		INSERT INTO users (username, email, password_hash, role, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, strings.TrimSpace(body.Username), strings.ToLower(strings.TrimSpace(body.Email)), string(hash), roleStudent, strings.TrimSpace(body.FirstName), strings.TrimSpace(body.LastName)).Scan(&id)
	if err != nil {
		if pgUniqueViolation(err) {
			writeErr(c, http.StatusBadRequest, "User with this email or username already exists")
			return
		}
		writeErr(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	token, cookie, err := utils.CreateTokenResponse(strconv.FormatInt(id, 10), a.Cfg)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Registration successful",
		"data": gin.H{
			"user": gin.H{
				"id":        id,
				"username":  strings.TrimSpace(body.Username),
				"email":     strings.ToLower(strings.TrimSpace(body.Email)),
				"role":      roleStudent,
				"firstName": strings.TrimSpace(body.FirstName),
				"lastName":  strings.TrimSpace(body.LastName),
			},
			"token": token,
		},
	})
}

func (a *API) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	var (
		id        int64
		username  string
		email     string
		passHash  string
		role      string
		firstName string
		lastName  string
		active    bool
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id, username, email, password_hash, role, first_name, last_name, is_active
		FROM users WHERE email = $1
	`, strings.ToLower(strings.TrimSpace(body.Email))).Scan(
		&id, &username, &email, &passHash, &role, &firstName, &lastName, &active,
	)
	if err != nil {
		writeErr(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if !active {
		writeErr(c, http.StatusUnauthorized, "User account has been deactivated")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passHash), []byte(body.Password)); err != nil {
		writeErr(c, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	now := time.Now()
	_, _ = a.DB.Exec(c.Request.Context(), `UPDATE users SET last_login=$1, updated_at=$1 WHERE id=$2`, now, id)

	token, cookie, err := utils.CreateTokenResponse(strconv.FormatInt(id, 10), a.Cfg)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user": gin.H{
				"id":        id,
				"username":  username,
				"email":     email,
				"role":      role,
				"firstName": firstName,
				"lastName":  lastName,
				"lastLogin": now,
			},
			"token": token,
		},
	})
}

func (a *API) Logout(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    "loggedout",
		Path:     "/",
		MaxAge:   10,
		HttpOnly: true,
	})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logout successful"})
}

func (a *API) GetMe(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	fullName := strings.TrimSpace(strings.TrimSpace(u.FirstName) + " " + strings.TrimSpace(u.LastName))
	if fullName == "" {
		fullName = u.Username
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":           u.ID,
				"username":     u.Username,
				"email":        u.Email,
				"role":         u.Role,
				"firstName":    u.FirstName,
				"lastName":     u.LastName,
				"fullName":     fullName,
				"totalLabTime": u.TotalLabTime,
				"totalSpent":   u.TotalSpent,
			},
		},
	})
}

func (a *API) UpdatePassword(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}

	var currentHash string
	if err := a.DB.QueryRow(c.Request.Context(), `SELECT password_hash FROM users WHERE id=$1`, u.ID).Scan(&currentHash); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(body.CurrentPassword)) != nil {
		writeErr(c, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 12)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	now := time.Now()
	_, err = a.DB.Exec(c.Request.Context(), `
		UPDATE users SET password_hash=$1, password_changed_at=$2, updated_at=$2 WHERE id=$3
	`, string(hash), now, u.ID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to update password")
		return
	}

	token, cookie, err := utils.CreateTokenResponse(strconv.FormatInt(u.ID, 10), a.Cfg)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password updated successfully", "data": gin.H{"token": token}})
}

func (a *API) RefreshToken(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	token, cookie, err := utils.CreateTokenResponse(strconv.FormatInt(u.ID, 10), a.Cfg)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	http.SetCookie(c.Writer, cookie)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Token refreshed successfully", "data": gin.H{"token": token}})
}

func (a *API) ForgotPassword(c *gin.Context) {
	var body struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Please provide a valid email address")
		return
	}

	var userID int64
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id FROM users WHERE email=$1
	`, strings.ToLower(strings.TrimSpace(body.Email))).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "If an account with that email exists, a password reset link has been sent.",
		})
		return
	}

	rawTokenBytes := make([]byte, 32)
	if _, err := rand.Read(rawTokenBytes); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate reset token")
		return
	}
	plainToken := hex.EncodeToString(rawTokenBytes)
	hash := sha256.Sum256([]byte(plainToken))
	hashedToken := hex.EncodeToString(hash[:])
	expiresAt := time.Now().Add(10 * time.Minute)

	if _, err := a.DB.Exec(c.Request.Context(), `
		UPDATE users SET password_reset_token=$1, password_reset_expires=$2, updated_at=now()
		WHERE id=$3
	`, hashedToken, expiresAt, userID); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to persist reset token")
		return
	}

	response := gin.H{
		"success": true,
		"message": "If an account with that email exists, a password reset link has been sent.",
	}
	if a.Cfg.NodeEnv == "development" {
		response["data"] = gin.H{
			"resetToken": plainToken,
			"resetURL":   fmt.Sprintf("%s/reset-password/%s", a.Cfg.ClientURL, plainToken),
			"expiresAt":  expiresAt,
		}
	}

	c.JSON(http.StatusOK, response)
}

func (a *API) ResetPassword(c *gin.Context) {
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		writeErr(c, http.StatusBadRequest, "Reset token is required")
		return
	}

	var body struct {
		Password        string `json:"password" binding:"required,min=8"`
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	if body.Password != body.ConfirmPassword {
		writeErr(c, http.StatusBadRequest, "Passwords do not match")
		return
	}

	hash := sha256.Sum256([]byte(token))
	hashedToken := hex.EncodeToString(hash[:])

	var userID int64
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT id FROM users
		WHERE password_reset_token=$1
			AND password_reset_expires IS NOT NULL
			AND password_reset_expires > now()
	`, hashedToken).Scan(&userID)
	if err != nil {
		writeErr(c, http.StatusBadRequest, "Token is invalid or has expired")
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	now := time.Now()
	if _, err := a.DB.Exec(c.Request.Context(), `
		UPDATE users
		SET password_hash=$1,
			password_changed_at=$2,
			password_reset_token=NULL,
			password_reset_expires=NULL,
			updated_at=$2
		WHERE id=$3
	`, string(passwordHash), now, userID); err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to update password")
		return
	}

	jwtToken, cookie, err := utils.CreateTokenResponse(strconv.FormatInt(userID, 10), a.Cfg)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	http.SetCookie(c.Writer, cookie)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset successful",
		"data":    gin.H{"token": jwtToken},
	})
}

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
	connInfo := map[string]interface{}{
		"host":         containerIP,
		"ip":           containerIP,
		"port":         port,
		"url":          fmt.Sprintf("http://%s:%d", containerIP, port),
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
	if assetID.Valid {
		sessionPayload["lab"] = assetID.Int64
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"session": sessionPayload}})
}

func (a *API) SubmitTaskFlag(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}
	taskID, ok := parseInt64Param(c, "task_id")
	if !ok {
		return
	}

	var body struct {
		Flag string `json:"flag" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	a.submitFlagForTask(c, u, taskID, body.Flag)
}

func (a *API) submitFlagForTask(c *gin.Context, u *AuthUser, taskID int64, flag string) {

	if a.RedisSvc != nil && a.RedisSvc.Available() {
		allowed, _, _ := a.RedisSvc.RateLimit(c.Request.Context(), fmt.Sprintf("xv:ratelimit:submit-flag:%d:%d", u.ID, taskID), 5, 60*time.Second)
		if !allowed {
			writeErr(c, http.StatusTooManyRequests, "Too many flag attempts. Please wait before retrying")
			return
		}
	}

	var (
		roomID   int64
		tType    string
		flagType string
		flagHash string
		points   int64
	)
	err := a.DB.QueryRow(c.Request.Context(), `
		SELECT room_id, type, flag_type, COALESCE(flag_hash,''), points
		FROM tasks
		WHERE id=$1 AND is_published=true
	`, taskID).Scan(&roomID, &tType, &flagType, &flagHash, &points)
	if err != nil {
		writeErr(c, http.StatusNotFound, "Task not found")
		return
	}
	if strings.TrimSpace(flagHash) == "" {
		writeErr(c, http.StatusBadRequest, "This task has no flag configured")
		return
	}
	if tType != "flag" && strings.TrimSpace(flagType) == "" {
		writeErr(c, http.StatusBadRequest, "This task does not accept flags")
		return
	}

	var (
		attempts     int64
		completedAt  *time.Time
		pointsEarned int64
	)
	err = a.DB.QueryRow(c.Request.Context(), `
		SELECT attempts, completed_at, points_earned
		FROM progress
		WHERE user_id=$1 AND task_id=$2
	`, u.ID, taskID).Scan(&attempts, &completedAt, &pointsEarned)
	if err == nil && completedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Task already completed",
			"data":    gin.H{"taskId": taskID, "pointsEarned": pointsEarned, "alreadySolved": true},
		})
		return
	}

	isCorrect := strings.EqualFold(hashSHA256(flag), strings.TrimSpace(flagHash))
	now := time.Now()
	if isCorrect {
		err = a.DB.QueryRow(c.Request.Context(), `
			INSERT INTO progress (user_id, room_id, task_id, state, started_at, completed_at, attempts, points_earned, created_at, updated_at)
			VALUES ($1, $2, $3, 'completed', $4, $4, 1, $5, $4, $4)
			ON CONFLICT (user_id, task_id) DO UPDATE SET
				state='completed',
				completed_at=COALESCE(progress.completed_at, EXCLUDED.completed_at),
				attempts=progress.attempts+1,
				points_earned=GREATEST(progress.points_earned, EXCLUDED.points_earned),
				updated_at=EXCLUDED.updated_at
			RETURNING attempts, completed_at, points_earned
		`, u.ID, roomID, taskID, now, points).Scan(&attempts, &completedAt, &pointsEarned)
		if err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to update progress")
			return
		}

		if a.RedisSvc != nil && a.RedisSvc.Available() {
			_, _ = a.RedisSvc.IncrementScore(c.Request.Context(), strconv.FormatInt(u.ID, 10), float64(points))
			_, _ = a.RedisSvc.MarkFlagSubmitted(c.Request.Context(), strconv.FormatInt(u.ID, 10), strconv.FormatInt(taskID, 10))
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Correct flag!",
			"data":    gin.H{"taskId": taskID, "pointsEarned": pointsEarned},
		})
		return
	}

	err = a.DB.QueryRow(c.Request.Context(), `
		INSERT INTO progress (user_id, room_id, task_id, state, started_at, attempts, points_earned, created_at, updated_at)
		VALUES ($1, $2, $3, 'in_progress', $4, 1, 0, $4, $4)
		ON CONFLICT (user_id, task_id) DO UPDATE SET
			attempts=progress.attempts+1,
			updated_at=EXCLUDED.updated_at
		RETURNING attempts
	`, u.ID, roomID, taskID, now).Scan(&attempts)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to update progress")
		return
	}

	writeErr(c, http.StatusBadRequest, "Incorrect flag")
}

func (a *API) SubmitFlag(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var body struct {
		TaskID int64  `json:"taskId" binding:"required"`
		Flag   string `json:"flag" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		writeErr(c, http.StatusBadRequest, "Validation failed: "+err.Error())
		return
	}
	a.submitFlagForTask(c, u, body.TaskID, body.Flag)
}

func (a *API) GetMyProgress(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT task_id, state, started_at, completed_at, attempts, points_earned
		FROM progress
		WHERE user_id=$1
		ORDER BY updated_at DESC
	`, u.ID)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch progress")
		return
	}
	defer rows.Close()

	progress := make([]gin.H, 0)
	var completedCount int64
	var totalPoints int64
	for rows.Next() {
		var taskID int64
		var state string
		var startedAt time.Time
		var completedAt *time.Time
		var attempts, pointsEarned int64
		if err := rows.Scan(&taskID, &state, &startedAt, &completedAt, &attempts, &pointsEarned); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode progress")
			return
		}
		if completedAt != nil {
			completedCount++
		}
		totalPoints += pointsEarned
		progress = append(progress, gin.H{
			"taskId":       strconv.FormatInt(taskID, 10),
			"state":        state,
			"startedAt":    startedAt,
			"completedAt":  completedAt,
			"attempts":     attempts,
			"pointsEarned": pointsEarned,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"progress": progress,
			"summary": gin.H{
				"completedTasks": completedCount,
				"totalPoints":    totalPoints,
			},
		},
	})
}

func (a *API) GetLeaderboard(c *gin.Context) {
	type entry struct {
		UserID   int64
		Username string
		Points   int64
	}
	entries := make([]entry, 0)

	rows, err := a.DB.Query(c.Request.Context(), `
		SELECT u.id, u.username, COALESCE(SUM(p.points_earned), 0) AS score
		FROM users u
		LEFT JOIN progress p ON p.user_id=u.id
		GROUP BY u.id, u.username
		ORDER BY score DESC, u.id ASC
		LIMIT 100
	`)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch leaderboard")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.Username, &e.Points); err != nil {
			writeErr(c, http.StatusInternalServerError, "Failed to decode leaderboard")
			return
		}
		entries = append(entries, e)
	}

	out := make([]gin.H, 0, len(entries))
	for i, e := range entries {
		out = append(out, gin.H{
			"rank":     i + 1,
			"userId":   e.UserID,
			"username": e.Username,
			"points":   e.Points,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"leaderboard": out}})
}

func (a *API) GetMyRank(c *gin.Context) {
	u := getAuthUser(c)
	if u == nil {
		writeErr(c, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var rank int64
	var points int64
	err := a.DB.QueryRow(c.Request.Context(), `
		WITH scores AS (
			SELECT u.id, COALESCE(SUM(p.points_earned), 0) AS score
			FROM users u
			LEFT JOIN progress p ON p.user_id = u.id
			GROUP BY u.id
		), ranked AS (
			SELECT id, score, RANK() OVER (ORDER BY score DESC, id ASC) AS rnk
			FROM scores
		)
		SELECT rnk, score FROM ranked WHERE id=$1
	`, u.ID).Scan(&rank, &points)
	if err != nil {
		writeErr(c, http.StatusInternalServerError, "Failed to fetch rank")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"rank": rank, "points": points}})
}

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
