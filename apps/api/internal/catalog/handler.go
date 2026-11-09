package catalog

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hocde/api/internal/httpx"
)

type Handler struct {
	db           *pgxpool.Pool
	includeDraft bool // dev: hiện cả bản nháp
}

func Register(r fiber.Router, db *pgxpool.Pool, includeDraft bool) {
	h := &Handler{db: db, includeDraft: includeDraft}
	r.Get("/subjects", h.ListSubjects)
	r.Get("/courses/:subject/:grade", h.GetCourse)
	r.Get("/lessons/:slug", h.GetLesson)
	r.Post("/lessons/:slug/check", h.CheckAnswer)
}

type Subject struct {
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Color       string  `json:"color"`
	IconKey     string  `json:"icon_key"`
}

func (h *Handler) ListSubjects(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(),
		`SELECT slug, name, description, color, icon_key FROM subjects WHERE is_active ORDER BY sort_order`)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []Subject{}
	for rows.Next() {
		var s Subject
		if err := rows.Scan(&s.Slug, &s.Name, &s.Description, &s.Color, &s.IconKey); err != nil {
			return err
		}
		out = append(out, s)
	}
	return httpx.OK(c, out)
}
