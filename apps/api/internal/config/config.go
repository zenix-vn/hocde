package config

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	Env                string
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CORSOrigins        string
	PublicURL          string // URL công khai của web, VD https://hocde.vn
	GoogleClientID     string
	GoogleClientSecret string
	AccessTTL          time.Duration
	RefreshTTL         time.Duration
}

func Load() Config {
	return Config{
		Env:                get("APP_ENV", "development"),
		Port:               get("HTTP_PORT", "8080"),
		DatabaseURL:        get("DATABASE_URL", "postgres://hocde:hocde@localhost:5432/hocde?sslmode=disable"),
		JWTSecret:          get("JWT_SECRET", "change-me"),
		CORSOrigins:        get("CORS_ORIGINS", "http://localhost:3000"),
		PublicURL:          strings.TrimRight(get("PUBLIC_URL", "http://localhost:3000"), "/"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		AccessTTL:          15 * time.Minute,
		RefreshTTL:         30 * 24 * time.Hour,
	}
}

func (c Config) IsProd() bool        { return strings.EqualFold(c.Env, "production") }
func (c Config) SecureCookies() bool { return strings.HasPrefix(c.PublicURL, "https://") }
func (c Config) GoogleEnabled() bool { return c.GoogleClientID != "" && c.GoogleClientSecret != "" }

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
