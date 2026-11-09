package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/hocde/api/internal/config"
	"github.com/hocde/api/internal/platform"
	"github.com/hocde/api/internal/server"
)

func main() {
	_ = godotenv.Load(".env", "../../.env")
	cfg := config.Load()

	ctx := context.Background()
	db, err := platform.NewPG(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	app := server.New(cfg, db)
	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		_ = app.ShutdownWithTimeout(10 * time.Second)
	}()
	log.Fatal(app.Listen(":" + cfg.Port))
}
