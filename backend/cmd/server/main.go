package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/booking"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/db"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/pool"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/user"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/redis/go-redis/v9"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Database
	database, err := db.Connect(os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	// Auto-migrate
	if err := database.RunMigrations(context.Background(), "./migrations"); err != nil {
		slog.Error("migration failed", "error", err)
	}

	// Seed admin
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminEmail != "" && adminPassword != "" {
		if err := database.SeedAdmin(context.Background(), adminEmail, adminPassword); err != nil {
			slog.Error("seed admin failed", "error", err)
		}
	}

	// Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr: parseRedisURL(os.Getenv("REDIS_URL")),
	})
	defer redisClient.Close()

	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}

	// Services
	authService := auth.NewService(database, os.Getenv("JWT_SECRET"))
	userService := user.NewService(database)
	poolManager := pool.NewManager(3)
	wsHub := ws.NewHub()
	bookingService := booking.NewService(database, redisClient, poolManager, wsHub)

	// Run WebSocket hub
	go wsHub.Run()

	// Router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Routes
	r.Route("/api", func(r chi.Router) {
		// Health
		r.Get("/health", healthHandler(database, redisClient, poolManager))

		// Auth (public)
		r.Post("/auth/login", authService.LoginHandler)
		r.Post("/auth/refresh", authService.RefreshHandler)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authService.AuthMiddleware)

			r.Post("/auth/logout", authService.LogoutHandler)

			// Users
			r.Get("/users/me", userService.GetMeHandler)
			r.Put("/users/me", userService.UpdateMeHandler)

			// Admin-only user management
			r.Group(func(r chi.Router) {
				r.Use(authService.RequireRole("admin"))
				r.Get("/users", userService.ListHandler)
				r.Post("/users", userService.CreateHandler)
				r.Delete("/users/{id}", userService.DeleteHandler)
			})

			// Bookings
			r.Get("/bookings", bookingService.ListHandler)
			r.Post("/bookings", bookingService.CreateHandler)
			r.Post("/bookings/preview", bookingService.PreviewHandler)
			r.Get("/bookings/{id}", bookingService.GetHandler)
			r.Post("/bookings/{id}/confirm", bookingService.ConfirmHandler)
			r.Delete("/bookings/{id}", bookingService.CancelHandler)

			// Pool status
			r.Get("/pool/status", poolManager.StatusHandler)

			// WebSocket
			r.Get("/ws", wsHub.ServeWS)

			// Audit (admin)
			r.Group(func(r chi.Router) {
				r.Use(authService.RequireRole("admin"))
				r.Get("/audit", bookingService.AuditHandler)
			})
		})

		// Internal (claw callbacks, no auth - internal network only)
		r.Route("/internal", func(r chi.Router) {
			r.Post("/claw/callback", bookingService.ClawCallbackHandler)
		})
	})

	// Server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		slog.Info("server starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	slog.Info("server stopped")
}

func parseRedisURL(url string) string {
	// Simple redis URL parser: redis://host:port → host:port
	if len(url) > 8 && url[:8] == "redis://" {
		return url[8:]
	}
	return "localhost:6379"
}

func healthHandler(database *db.DB, redisClient *redis.Client, pm *pool.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		status := "ok"

		dbOk := database.Ping(ctx) == nil
		redisOk := redisClient.Ping(ctx).Err() == nil
		poolStatus := pm.Status()

		if !dbOk || !redisOk {
			status = "degraded"
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"%s","db":%t,"redis":%t,"pool":{"total":%d,"active":%d,"queue":%d}}`,
			status, dbOk, redisOk, poolStatus.Total, poolStatus.Active, poolStatus.QueueLength)
	}
}
