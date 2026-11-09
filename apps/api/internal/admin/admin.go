// Package admin cung cấp API quản trị: người dùng, nội dung (môn/khoá/chương/bài), thống kê, nhật ký.
// Mọi route yêu cầu đăng nhập và kiểm tra lại vai trò trong CSDL (đổi quyền/khoá tài khoản có hiệu lực ngay).
package admin

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/httpx"
)

type Handler struct {
	db *pgxpool.Pool
}

// Register gắn các route /admin. Biên tập viên (editor) quản lý nội dung; chỉ admin được quản lý
// người dùng, xem thống kê và nhật ký.
func Register(api fiber.Router, db *pgxpool.Pool, tok *auth.Manager) {
	h := &Handler{db: db}
	g := api.Group("/admin", auth.Require(tok))

	staff := h.requireRole("admin", "editor")
	only := h.requireRole("admin")

	g.Get("/whoami", staff, h.WhoAmI)

	// --- chỉ admin ---
	g.Get("/stats", only, h.Stats)
	g.Get("/users", only, h.ListUsers)
	g.Get("/users/:id", only, h.GetUser)
	g.Patch("/users/:id", only, h.UpdateUser)
	g.Delete("/users/:id", only, h.DeleteUser)
	g.Post("/users/:id/revoke-sessions", only, h.RevokeSessions)
	g.Get("/profiles", only, h.ListProfiles)
	g.Get("/audit", only, h.ListAudit)

	// --- admin + editor: nội dung ---
	g.Get("/subjects", staff, h.ListSubjects)
	g.Post("/subjects", staff, h.CreateSubject)
	g.Patch("/subjects/:id", staff, h.UpdateSubject)
	g.Delete("/subjects/:id", only, h.DeleteSubject)

	g.Get("/courses", staff, h.ListCourses)
	g.Post("/courses", staff, h.CreateCourse)
	g.Get("/courses/:id", staff, h.GetCourse)
	g.Patch("/courses/:id", staff, h.UpdateCourse)
	g.Delete("/courses/:id", only, h.DeleteCourse)
	g.Post("/courses/:id/units", staff, h.CreateUnit)
	g.Post("/courses/:id/units/reorder", staff, h.ReorderUnits)

	g.Patch("/units/:id", staff, h.UpdateUnit)
	g.Delete("/units/:id", only, h.DeleteUnit)
	g.Post("/units/:id/lessons", staff, h.CreateLesson)
	g.Post("/units/:id/lessons/reorder", staff, h.ReorderLessons)

	g.Get("/lessons/:id", staff, h.GetLesson)
	g.Patch("/lessons/:id", staff, h.UpdateLesson)
	g.Put("/lessons/:id/content", staff, h.SaveContent)
	g.Post("/lessons/:id/status", staff, h.SetLessonStatus)
	g.Post("/lessons/:id/duplicate", staff, h.DuplicateLesson)
	g.Delete("/lessons/:id", only, h.DeleteLesson)
}

// ---------- phân quyền ----------

func (h *Handler) requireRole(roles ...string) fiber.Handler {
	allowed := map[string]bool{}
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *fiber.Ctx) error {
		var role string
		var disabled bool
		err := h.db.QueryRow(c.Context(),
			`SELECT role::text, disabled_at IS NOT NULL FROM users WHERE id=$1 AND deleted_at IS NULL`,
			auth.UserID(c)).Scan(&role, &disabled)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && disabled) {
			return fiber.NewError(fiber.StatusUnauthorized, "Cần đăng nhập")
		}
		if err != nil {
			return err
		}
		if !allowed[role] {
			return fiber.NewError(fiber.StatusForbidden, "Bạn không có quyền thực hiện thao tác này")
		}
		c.Locals("admin_role", role)
		return c.Next()
	}
}

func (h *Handler) WhoAmI(c *fiber.Ctx) error {
	return httpx.OK(c, fiber.Map{"id": auth.UserID(c), "role": c.Locals("admin_role")})
}

// ---------- helpers ----------

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// uuidParam đọc tham số :id và kiểm tra là UUID (tránh lỗi 500 từ Postgres).
func uuidParam(c *fiber.Ctx, name string) (string, error) {
	v := c.Params(name)
	if !uuidRe.MatchString(v) {
		return "", fiber.NewError(fiber.StatusNotFound, "Không tìm thấy")
	}
	return v, nil
}

func bad(msg string) error { return fiber.NewError(fiber.StatusBadRequest, msg) }

func conflict(c *fiber.Ctx, msg string) error {
	return httpx.Fail(c, fiber.StatusConflict, "CONFLICT", msg)
}

func notFound(what string) error {
	return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy "+what)
}

// dbErr chuyển lỗi Postgres thường gặp thành phản hồi thân thiện.
func dbErr(c *fiber.Ctx, err error, dupMsg string) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return conflict(c, dupMsg)
		case "23503":
			return conflict(c, "Mục này đang được dùng ở nơi khác nên không thể thực hiện")
		}
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy")
	}
	return err
}

type page struct{ N, Size, Offset int }

func paging(c *fiber.Ctx) page {
	n, _ := strconv.Atoi(c.Query("page", "1"))
	size, _ := strconv.Atoi(c.Query("page_size", "20"))
	if n < 1 {
		n = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	return page{N: n, Size: size, Offset: (n - 1) * size}
}

func listOK(c *fiber.Ctx, data any, p page, total int) error {
	return c.JSON(fiber.Map{"data": data, "meta": fiber.Map{"page": p.N, "page_size": p.Size, "total": total}})
}

// audit ghi nhật ký thao tác quản trị (lỗi ghi log không làm hỏng thao tác chính).
func (h *Handler) audit(c *fiber.Ctx, action, entity, entityID string, meta any) {
	b, _ := json.Marshal(meta)
	if meta == nil {
		b = []byte("null")
	}
	_, _ = h.db.Exec(context.WithoutCancel(c.Context()),
		`INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta) VALUES ($1,$2,$3,$4,$5::jsonb)`,
		auth.UserID(c), action, entity, entityID, string(b))
}
