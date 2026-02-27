package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/handlers"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/models"
	"github.com/xploitverse/backend/internal/services"
	ws "github.com/xploitverse/backend/ws"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// RegisterRoutes wires all API route groups onto the Gin engine.
func RegisterRoutes(r *gin.Engine, db *mongo.Database, cfg *config.Config) {
	// Auth rate limiter: 10 requests per 15 minutes
	authLimiter := middleware.NewRateLimiter(10, 15*time.Minute)

	// Create email service
	emailService := services.NewEmailService(services.SMTPConfig{
		Host:     cfg.SMTP.Host,
		Port:     cfg.SMTP.Port,
		Username: cfg.SMTP.Username,
		Password: cfg.SMTP.Password,
		From:     cfg.SMTP.From,
		FromName: cfg.SMTP.FromName,
	})

	// Create handler instances
	authHandler := &handlers.AuthHandler{DB: db, Cfg: cfg, EmailService: emailService}
	userHandler := &handlers.UserHandler{DB: db, Cfg: cfg}
	dockerSvc := services.NewDockerService()
	labHandler := &handlers.LabHandler{DB: db, Cfg: cfg, DockerSvc: dockerSvc}
	labSessionHandler := &handlers.LabSessionHandler{DB: db, Cfg: cfg}
	chatHandler := &handlers.ChatHandler{DB: db, Cfg: cfg}
	courseHandler := &handlers.CourseHandler{DB: db, Cfg: cfg}
	moduleHandler := &handlers.ModuleHandler{DB: db, Cfg: cfg}
	taskHandler := &handlers.TaskHandler{DB: db, Cfg: cfg}
	flagHandler := &handlers.FlagHandler{DB: db, Cfg: cfg}
	leaderboardHandler := &handlers.LeaderboardHandler{DB: db, Cfg: cfg}

	// Auth middleware shortcut
	auth := middleware.VerifyToken(cfg, db)

	api := r.Group("/api")

	// ── Auth Routes ───────────────────────────────────────────────
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/register", authLimiter.Middleware(), authHandler.Register)
		authGroup.POST("/login", authLimiter.Middleware(), authHandler.Login)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.GET("/me", auth, authHandler.GetMe)
		authGroup.PUT("/update-password", auth, authHandler.UpdatePassword)
		authGroup.POST("/refresh-token", auth, authHandler.RefreshToken)
		authGroup.POST("/forgot-password", authLimiter.Middleware(), authHandler.ForgotPassword)
		authGroup.POST("/reset-password/:token", authLimiter.Middleware(), authHandler.ResetPassword)
	}

	// ── User Routes ───────────────────────────────────────────────
	userGroup := api.Group("/users")
	userGroup.Use(auth)
	{
		userGroup.PUT("/profile", userHandler.UpdateProfile)
		userGroup.GET("/me/progress", userHandler.GetMyProgress)
		userGroup.GET("/stats", middleware.IsInstructor(), userHandler.GetUserStats)
		userGroup.GET("", middleware.IsAdmin(), userHandler.GetAllUsers)
		userGroup.GET("/:id", middleware.IsAdmin(), userHandler.GetUserByID)
		userGroup.PUT("/:id/role", middleware.IsAdmin(), userHandler.UpdateUserRole)
		userGroup.PUT("/:id/deactivate", middleware.IsAdmin(), userHandler.DeactivateUser)
		userGroup.PUT("/:id/reactivate", middleware.IsAdmin(), userHandler.ReactivateUser)
	}

	// ── Lab Routes ────────────────────────────────────────────────
	labGroup := api.Group("/labs")
	{
		labGroup.GET("", labHandler.GetAllLabs)
		labGroup.GET("/:id", labHandler.GetLabByID)

		labGroup.Use(auth)
		labGroup.POST("/start", labHandler.StartLab)
		labGroup.POST("/stop", labHandler.StopLab)
		labGroup.GET("/active-session", labHandler.GetActiveSession)
		labGroup.GET("/history", labHandler.GetSessionHistory)
		labGroup.GET("/session/:sessionId/status", labHandler.CheckSessionStatus)
		labGroup.POST("/session/:sessionId/provision", labHandler.CompleteProvisioning)
	}

	// ── Lab Session Routes ────────────────────────────────────────
	labSessionGroup := api.Group("/lab-sessions")
	labSessionGroup.Use(auth)
	{
		labSessionGroup.POST("", labSessionHandler.CreateLabSession)
		labSessionGroup.GET("", labSessionHandler.GetLabSessions)
		labSessionGroup.GET("/active", labSessionHandler.GetActiveSession)
		labSessionGroup.GET("/stats", middleware.IsInstructor(), labSessionHandler.GetSessionStats)
		labSessionGroup.GET("/:id", labSessionHandler.GetLabSessionByID)
		labSessionGroup.PATCH("/:id/status", middleware.CheckRole(models.RoleAdmin, models.RoleInstructor), labSessionHandler.UpdateSessionStatus)
		labSessionGroup.POST("/:id/terminate", labSessionHandler.TerminateSession)
		labSessionGroup.PATCH("/:id/notes", labSessionHandler.UpdateSessionNotes)
	}

	// ── Chat Routes ───────────────────────────────────────────────
	chatGroup := api.Group("/chat")
	chatGroup.Use(auth)
	{
		chatGroup.POST("", chatHandler.Chat)
		chatGroup.GET("/suggestions", chatHandler.GetSuggestions)
	}

	// ── Flags / Scoring Routes ────────────────────────────────────
	flagsGroup := api.Group("/flags")
	flagsGroup.Use(auth)
	{
		flagsGroup.POST("/submit", flagHandler.SubmitFlag)
	}

	// ── Course Content Routes ─────────────────────────────────────
	courseGroup := api.Group("/courses")
	{
		courseGroup.GET("", courseHandler.GetAllCourses)
		courseGroup.GET("/:slug", courseHandler.GetCourseBySlug)
	}

	moduleGroup := api.Group("/modules")
	{
		moduleGroup.GET("/:id", moduleHandler.GetModuleByID)
	}

	taskGroup := api.Group("/tasks")
	{
		taskGroup.GET("/:id", taskHandler.GetTaskByID)
	}

	// ── Leaderboard Routes ────────────────────────────────────────
	lbGroup := api.Group("/leaderboard")
	{
		lbGroup.GET("", leaderboardHandler.GetLeaderboard)
		lbGroup.GET("/me", auth, leaderboardHandler.GetMyRank)
	}

	// ── Admin Content Routes (Instructor/Admin) ───────────────────
	adminGroup := api.Group("/admin")
	adminGroup.Use(auth, middleware.IsInstructor())
	{
		adminGroup.POST("/courses", courseHandler.CreateCourse)
		adminGroup.PUT("/courses/:id", courseHandler.UpdateCourse)
		adminGroup.POST("/courses/:courseId/modules", moduleHandler.CreateModule)
		adminGroup.PUT("/modules/:id", moduleHandler.UpdateModule)
		adminGroup.POST("/modules/:moduleId/tasks", taskHandler.CreateTask)
		adminGroup.PUT("/tasks/:id", taskHandler.UpdateTask)
	}

	// ── WebSocket: Lab Terminal ───────────────────────────────────
	// GET /ws/terminal?sessionId=<id>&token=<jwt>
	r.GET("/ws/terminal", ws.TerminalHandler(db, cfg))
}

