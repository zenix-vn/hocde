package server

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hocde/api/internal/account"
	"github.com/hocde/api/internal/admin"
	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/catalog"
	"github.com/hocde/api/internal/config"
	"github.com/hocde/api/internal/httpx"
	"github.com/hocde/api/internal/middleware"
)

func New(cfg config.Config, db *pgxpool.Pool) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: httpx.ErrorHandler,
		BodyLimit:    2 * 1024 * 1024,
		AppName:      "hocde-api",
	})
	app.Use(recover.New(), requestid.New(), logger.New(), helmet.New(), compress.New(),
		cors.New(cors.Config{AllowOrigins: cfg.CORSOrigins, AllowCredentials: true}),
		limiter.New(limiter.Config{Max: 120, Expiration: time.Minute}))

	app.Get("/healthz", func(c *fiber.Ctx) error { return c.SendString("ok") })
	app.Get("/readyz", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			return fiber.NewError(fiber.StatusServiceUnavailable, "database unavailable")
		}
		return c.SendString("ready")
	})

	api := app.Group("/api/v1", middleware.OriginCheck(cfg.PublicURL, cfg.CORSOrigins))
	tok := auth.NewManager(cfg.JWTSecret, cfg.AccessTTL)
	// giới hạn chặt hơn cho các endpoint đăng nhập
	api.Use("/auth", limiter.New(limiter.Config{Max: 30, Expiration: time.Minute}))
	auth.NewHandler(cfg, auth.NewService(db, cfg.RefreshTTL), tok).Register(api)
	account.NewHandler(cfg, db, tok).Register(api)
	catalog.Register(api, db, !cfg.IsProd())
	admin.Register(api, db, tok)
	// TODO: auth, account, lesson, exercise, progress, cms (xem docs/04-api.md)
	return app
}
