package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/xploitverse/backend/internal/config"
	"github.com/xploitverse/backend/internal/database"
	"github.com/xploitverse/backend/internal/middleware"
	"github.com/xploitverse/backend/internal/routes"
	"github.com/xploitverse/backend/internal/services"
	"github.com/xploitverse/backend/internal/ws"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	if cfg.NodeEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to MongoDB
	db, err := database.ConnectDB(cfg.MongoURI)
	if err != nil {
		log.Fatalf("❌ Failed to connect to MongoDB: %v", err)
	}

	// Create Gin engine
	r := gin.New()

	// ── Global Middleware ──────────────────────────────────────────
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.ClientURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Security headers (equivalent to helmet)
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	})

	// Rate limiter: 100 requests per 15 minutes (general)
	generalLimiter := middleware.NewRateLimiter(100, 15*time.Minute)
	r.Use(generalLimiter.Middleware())

	// Error handler
	r.Use(middleware.ErrorHandler(cfg))

	// ── Health Check ──────────────────────────────────────────────
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"message":     "XploitVerse API is running",
			"environment": cfg.NodeEnv,
			"timestamp":   time.Now().Format(time.RFC3339),
		})
	})

	// ── API Info ──────────────────────────────────────────────────
	r.GET("/api", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Welcome to XploitVerse API",
			"data": gin.H{
				"version":     "1.0.0",
				"description": "XploitVerse - Interactive Cybersecurity Training Platform",
				"runtime":     "Go " + runtime.Version(),
				"endpoints": gin.H{
					"auth":        "/api/auth",
					"users":       "/api/users",
					"labs":        "/api/labs",
					"labSessions": "/api/lab-sessions",
					"chat":        "/api/chat",
					"websocket":   "/ws",
				},
			},
		})
	})

	// ── Create shared Docker service ──────────────────────────────
	dockerSvc := services.NewDockerService()

	// ── Create shared Redis service ───────────────────────────────
	redisSvc := services.NewRedisService(cfg.RedisURL)
	defer redisSvc.Close()

	// ── Register API Routes ───────────────────────────────────────
	routes.RegisterRoutes(r, db, cfg, dockerSvc, redisSvc)

	// ── WebSocket ─────────────────────────────────────────────────
	hub := ws.NewHub(db, cfg)
	r.GET("/ws", hub.HandleWebSocket)

	// ── 404 Handler ───────────────────────────────────────────────
	r.NoRoute(middleware.NotFound())

	// ── Start Auto-Termination Service ────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	autoTermSvc := services.NewAutoTerminationService(db, dockerSvc)
	autoTermSvc.Start(ctx)

	// ── Start Server ──────────────────────────────────────────────
	addr := ":" + cfg.Port

	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit

		log.Println("🛑 Shutting down server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("❌ Server forced to shutdown: %v", err)
		}
	}()

	log.Println("╔══════════════════════════════════════════╗")
	log.Println("║   🚀 XploitVerse Go API Server           ║")
	log.Printf("║   📡 Port: %s                           ║\n", cfg.Port)
	log.Printf("║   🌍 Environment: %-21s  ║\n", cfg.NodeEnv)
	log.Printf("║   🔗 Client URL: %-22s ║\n", cfg.ClientURL)
	log.Printf("║   🐳 Docker: %-27v ║\n", dockerSvc.Available())
	log.Printf("║   📦 Redis:  %-27v ║\n", redisSvc.Available())
	log.Println("╚══════════════════════════════════════════╝")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ Server error: %v", err)
	}

	log.Println("✅ Server exited gracefully")
}
