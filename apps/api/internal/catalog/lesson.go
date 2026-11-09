package catalog

import (
	"encoding/json"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"github.com/hocde/api/internal/httpx"
)

// statusFilter: production chỉ hiện bài đã xuất bản; môi trường dev hiện cả bản nháp để soạn/xem thử.
func (h *Handler) statusFilter(col string) string {
	if h.includeDraft {
		return col + " IN ('draft','review','published')"
	}
	return col + " = 'published'"
}

type lessonItem struct {
	Slug       string  `json:"slug"`
	Title      string  `json:"title"`
	Summary    *string `json:"summary"`
	EstMinutes int     `json:"est_minutes"`
	XPReward   int     `json:"xp_reward"`
}

type unitItem struct {
	Slug    string       `json:"slug"`
	Title   string       `json:"title"`
	Summary *string      `json:"summary"`
	Lessons []lessonItem `json:"lessons"`
}

// GET /courses/:subject/:grade — chương và bài của một khoá học.
func (h *Handler) GetCourse(c *fiber.Ctx) error {
	grade, err := c.ParamsInt("grade")
	if err != nil || grade < 1 || grade > 9 {
		return fiber.NewError(fiber.StatusBadRequest, "Lớp không hợp lệ")
	}
	var (
		courseID, title string
		summary         *string
	)
	err = h.db.QueryRow(c.Context(), `
		SELECT c.id, c.title, c.summary FROM courses c JOIN subjects s ON s.id=c.subject_id
		WHERE s.slug=$1 AND c.grade=$2 AND `+h.statusFilter("c.status"),
		c.Params("subject"), grade).Scan(&courseID, &title, &summary)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(fiber.StatusNotFound, "Chưa có khoá học này")
	}
	if err != nil {
		return err
	}

	rows, err := h.db.Query(c.Context(), `
		SELECT u.slug, u.title, u.summary, l.slug, l.title, l.summary, l.est_minutes, l.xp_reward
		FROM units u LEFT JOIN lessons l ON l.unit_id=u.id AND `+h.statusFilter("l.status")+`
		WHERE u.course_id=$1 ORDER BY u.sort_order, l.sort_order`, courseID)
	if err != nil {
		return err
	}
	defer rows.Close()

	units := []unitItem{}
	for rows.Next() {
		var (
			uSlug, uTitle string
			uSum          *string
			lSlug, lTitle *string
			lSum          *string
			est, xp       *int
		)
		if err := rows.Scan(&uSlug, &uTitle, &uSum, &lSlug, &lTitle, &lSum, &est, &xp); err != nil {
			return err
		}
		if len(units) == 0 || units[len(units)-1].Slug != uSlug {
			units = append(units, unitItem{Slug: uSlug, Title: uTitle, Summary: uSum, Lessons: []lessonItem{}})
		}
		if lSlug != nil {
			u := &units[len(units)-1]
			u.Lessons = append(u.Lessons, lessonItem{Slug: *lSlug, Title: *lTitle, Summary: lSum, EstMinutes: *est, XPReward: *xp})
		}
	}
	return httpx.OK(c, fiber.Map{
		"title": title, "summary": summary, "grade": grade, "units": units,
	})
}

func (h *Handler) loadContent(c *fiber.Ctx) (title string, est, xp int, blocks []map[string]any, err error) {
	var raw []byte
	err = h.db.QueryRow(c.Context(),
		`SELECT title, est_minutes, xp_reward, content FROM lessons WHERE slug=$1 AND `+h.statusFilter("status"),
		c.Params("slug")).Scan(&title, &est, &xp, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", 0, 0, nil, fiber.NewError(fiber.StatusNotFound, "Không tìm thấy bài học")
	}
	if err != nil {
		return
	}
	var doc struct {
		Blocks []map[string]any `json:"blocks"`
	}
	if err = json.Unmarshal(raw, &doc); err != nil {
		return
	}
	return title, est, xp, doc.Blocks, nil
}

// GET /lessons/:slug — nội dung bài, đã gỡ đáp án.
func (h *Handler) GetLesson(c *fiber.Ctx) error {
	title, est, xp, blocks, err := h.loadContent(c)
	if err != nil {
		return err
	}
	safe := make([]map[string]any, len(blocks))
	for i, b := range blocks {
		safe[i] = Sanitize(b)
	}
	return httpx.OK(c, fiber.Map{
		"slug": c.Params("slug"), "title": title, "est_minutes": est, "xp_reward": xp, "blocks": safe,
	})
}

type checkReq struct {
	BlockID  string         `json:"block_id"`
	Response map[string]any `json:"response"`
}

// POST /lessons/:slug/check — chấm một bài tập. Chưa lưu tiến độ (làm ở bước sau).
func (h *Handler) CheckAnswer(c *fiber.Ctx) error {
	var req checkReq
	if err := c.BodyParser(&req); err != nil || req.BlockID == "" || req.Response == nil {
		return fiber.NewError(fiber.StatusBadRequest, "Yêu cầu không hợp lệ")
	}
	_, _, _, blocks, err := h.loadContent(c)
	if err != nil {
		return err
	}
	for _, b := range blocks {
		if s(b["id"]) != req.BlockID || s(b["type"]) != "exercise" {
			continue
		}
		correct, ok := Grade(b, req.Response)
		if !ok {
			return fiber.NewError(fiber.StatusBadRequest, "Câu trả lời không hợp lệ")
		}
		return httpx.OK(c, fiber.Map{"correct": correct, "explanation": ExplanationFor(b, correct)})
	}
	return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy bài tập")
}
