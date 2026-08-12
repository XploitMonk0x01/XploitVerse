package pgapi

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/xploitverse/backend/internal/config"
	baseMiddleware "github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/services"
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
