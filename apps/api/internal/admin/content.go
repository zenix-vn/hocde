package admin

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/content"
	"github.com/hocde/api/internal/httpx"
)

var colorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func checkSlug(s string) error {
	if !content.ValidSlug(s) {
		return bad("Đường dẫn (slug) chỉ gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ: tieng-viet")
	}
	return nil
}

func checkTitle(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" || len([]rune(s)) > 200 {
		return "", bad("Tiêu đề phải từ 1 đến 200 ký tự")
	}
	return s, nil
}

func checkStatus(s string) error {
	if !content.ValidStatus(s) {
		return bad("Trạng thái không hợp lệ")
	}
	return nil
}

// ======================= Môn học =======================

type subjectRow struct {
	ID          int16   `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Color       string  `json:"color"`
	IconKey     string  `json:"icon_key"`
	SortOrder   int     `json:"sort_order"`
	IsActive    bool    `json:"is_active"`
	Courses     int     `json:"courses"`
}

func (h *Handler) ListSubjects(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), `
		SELECT s.id, s.slug, s.name, s.description, s.color, s.icon_key, s.sort_order, s.is_active,
		       (SELECT count(*) FROM courses WHERE subject_id=s.id)
		FROM subjects s ORDER BY s.sort_order, s.id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []subjectRow{}
	for rows.Next() {
		var s subjectRow
		if err := rows.Scan(&s.ID, &s.Slug, &s.Name, &s.Description, &s.Color, &s.IconKey, &s.SortOrder, &s.IsActive, &s.Courses); err != nil {
			return err
		}
		out = append(out, s)
	}
	return httpx.OK(c, out)
}

type subjectReq struct {
	Slug        *string `json:"slug"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	IconKey     *string `json:"icon_key"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

func (r *subjectReq) validate(creating bool) error {
	if creating && (r.Slug == nil || r.Name == nil) {
		return bad("Cần nhập tên và đường dẫn (slug) của môn học")
	}
	if r.Slug != nil {
		if err := checkSlug(*r.Slug); err != nil {
			return err
		}
	}
	if r.Name != nil {
		n, err := checkTitle(*r.Name)
		if err != nil {
			return err
		}
		r.Name = &n
	}
	if r.Color != nil && !colorRe.MatchString(*r.Color) {
		return bad("Màu phải có dạng #RRGGBB")
	}
	if r.IconKey != nil && (strings.TrimSpace(*r.IconKey) == "" || len(*r.IconKey) > 40) {
		return bad("Biểu tượng không hợp lệ")
	}
	if r.SortOrder != nil && (*r.SortOrder < 0 || *r.SortOrder > 1000) {
		return bad("Thứ tự không hợp lệ")
	}
	return nil
}

func (h *Handler) CreateSubject(c *fiber.Ctx) error {
	var r subjectReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(true); err != nil {
		return err
	}
	color, icon := "#0b63d6", "book"
	if r.Color != nil {
		color = *r.Color
	}
	if r.IconKey != nil {
		icon = *r.IconKey
	}
	order, active := 0, true
	if r.SortOrder != nil {
		order = *r.SortOrder
	}
	if r.IsActive != nil {
		active = *r.IsActive
	}
	var id int16
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO subjects (slug, name, description, color, icon_key, sort_order, is_active)
		VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,$7) RETURNING id`,
		*r.Slug, *r.Name, deref(r.Description), color, icon, order, active).Scan(&id)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho môn khác")
	}
	h.audit(c, "subject.create", "subject", fmt.Sprint(id), fiber.Map{"slug": *r.Slug})
	return httpx.OK(c, fiber.Map{"id": id})
}

func (h *Handler) UpdateSubject(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return notFound("môn học")
	}
	var r subjectReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(false); err != nil {
		return err
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE subjects SET slug=COALESCE($2,slug), name=COALESCE($3,name),
		  description=CASE WHEN $4::text IS NULL THEN description ELSE NULLIF($4,'') END,
		  color=COALESCE($5,color), icon_key=COALESCE($6,icon_key),
		  sort_order=COALESCE($7,sort_order), is_active=COALESCE($8,is_active)
		WHERE id=$1`, id, r.Slug, r.Name, r.Description, r.Color, r.IconKey, r.SortOrder, r.IsActive)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho môn khác")
	}
	if tag.RowsAffected() == 0 {
		return notFound("môn học")
	}
	h.audit(c, "subject.update", "subject", fmt.Sprint(id), r)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) DeleteSubject(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return notFound("môn học")
	}
	var n int
	if err := h.db.QueryRow(c.Context(), `SELECT count(*) FROM courses WHERE subject_id=$1`, id).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return conflict(c, "Môn học còn khoá học. Hãy xoá hoặc chuyển các khoá học trước (hoặc chỉ cần ẩn môn này).")
	}
	tag, err := h.db.Exec(c.Context(), `DELETE FROM subjects WHERE id=$1`, id)
	if err != nil {
		return dbErr(c, err, "")
	}
	if tag.RowsAffected() == 0 {
		return notFound("môn học")
	}
	h.audit(c, "subject.delete", "subject", fmt.Sprint(id), nil)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// ======================= Khoá học =======================

type courseRow struct {
	ID          string  `json:"id"`
	SubjectID   int16   `json:"subject_id"`
	SubjectSlug string  `json:"subject_slug"`
	SubjectName string  `json:"subject_name"`
	Grade       int     `json:"grade"`
	Slug        string  `json:"slug"`
	Title       string  `json:"title"`
	Summary     *string `json:"summary"`
	Status      string  `json:"status"`
	SortOrder   int     `json:"sort_order"`
	Units       int     `json:"units"`
	Lessons     int     `json:"lessons"`
	Published   int     `json:"published_lessons"`
}

const courseSelect = `
	SELECT c.id::text, c.subject_id, s.slug, s.name, c.grade, c.slug, c.title, c.summary, c.status::text, c.sort_order,
	  (SELECT count(*) FROM units u WHERE u.course_id=c.id),
	  (SELECT count(*) FROM lessons l JOIN units u ON u.id=l.unit_id WHERE u.course_id=c.id),
	  (SELECT count(*) FROM lessons l JOIN units u ON u.id=l.unit_id WHERE u.course_id=c.id AND l.status='published')
	FROM courses c JOIN subjects s ON s.id=c.subject_id`

func scanCourse(row interface{ Scan(...any) error }) (courseRow, error) {
	var r courseRow
	err := row.Scan(&r.ID, &r.SubjectID, &r.SubjectSlug, &r.SubjectName, &r.Grade, &r.Slug, &r.Title, &r.Summary,
		&r.Status, &r.SortOrder, &r.Units, &r.Lessons, &r.Published)
	return r, err
}

func (h *Handler) ListCourses(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(), courseSelect+` ORDER BY s.sort_order, s.id, c.grade`)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []courseRow{}
	for rows.Next() {
		r, err := scanCourse(rows)
		if err != nil {
			return err
		}
		out = append(out, r)
	}
	return httpx.OK(c, out)
}

type courseReq struct {
	SubjectID *int16  `json:"subject_id"`
	Grade     *int    `json:"grade"`
	Slug      *string `json:"slug"`
	Title     *string `json:"title"`
	Summary   *string `json:"summary"`
	Status    *string `json:"status"`
	SortOrder *int    `json:"sort_order"`
}

func (r *courseReq) validate(creating bool) error {
	if creating && (r.SubjectID == nil || r.Grade == nil || r.Slug == nil || r.Title == nil) {
		return bad("Cần chọn môn, lớp và nhập tiêu đề, đường dẫn")
	}
	if r.Grade != nil && (*r.Grade < 1 || *r.Grade > 9) {
		return bad("Lớp phải từ 1 đến 9")
	}
	if r.Slug != nil {
		if err := checkSlug(*r.Slug); err != nil {
			return err
		}
	}
	if r.Title != nil {
		t, err := checkTitle(*r.Title)
		if err != nil {
			return err
		}
		r.Title = &t
	}
	if r.Status != nil {
		if err := checkStatus(*r.Status); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) CreateCourse(c *fiber.Ctx) error {
	var r courseReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(true); err != nil {
		return err
	}
	status := "draft"
	if r.Status != nil {
		status = *r.Status
	}
	var id string
	err := h.db.QueryRow(c.Context(), `
		INSERT INTO courses (subject_id, grade, slug, title, summary, status)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),$6::content_status) RETURNING id::text`,
		*r.SubjectID, *r.Grade, *r.Slug, *r.Title, deref(r.Summary), status).Scan(&id)
	if err != nil {
		return dbErr(c, err, "Môn này đã có khoá học cho lớp đó, hoặc đường dẫn đã được dùng")
	}
	h.audit(c, "course.create", "course", id, fiber.Map{"slug": *r.Slug})
	return httpx.OK(c, fiber.Map{"id": id})
}

type lessonBrief struct {
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	Est       int       `json:"est_minutes"`
	XP        int       `json:"xp_reward"`
	SortOrder int       `json:"sort_order"`
	Version   int       `json:"version"`
	Exercises int       `json:"exercises"`
	UpdatedAt time.Time `json:"updated_at"`
}

type unitFull struct {
	ID        string        `json:"id"`
	Slug      string        `json:"slug"`
	Title     string        `json:"title"`
	Summary   *string       `json:"summary"`
	SortOrder int           `json:"sort_order"`
	Lessons   []lessonBrief `json:"lessons"`
}

// GET /admin/courses/:id — khoá học cùng toàn bộ chương và bài (mọi trạng thái).
func (h *Handler) GetCourse(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	course, err := scanCourse(h.db.QueryRow(c.Context(), courseSelect+` WHERE c.id=$1`, id))
	if err != nil {
		return dbErr(c, err, "")
	}
	rows, err := h.db.Query(c.Context(), `
		SELECT u.id::text, u.slug, u.title, u.summary, u.sort_order,
		       l.id::text, l.slug, l.title, l.status::text, l.est_minutes, l.xp_reward, l.sort_order, l.version, l.updated_at,
		       (SELECT count(*) FROM exercises e WHERE e.lesson_id=l.id)
		FROM units u LEFT JOIN lessons l ON l.unit_id=u.id
		WHERE u.course_id=$1 ORDER BY u.sort_order, u.title, l.sort_order, l.created_at`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	units := []unitFull{}
	for rows.Next() {
		var (
			u                               unitFull
			lID, lSlug, lTitle, lStatus     *string
			est, xp, lOrder, version, exCnt *int
			updated                         *time.Time
		)
		if err := rows.Scan(&u.ID, &u.Slug, &u.Title, &u.Summary, &u.SortOrder,
			&lID, &lSlug, &lTitle, &lStatus, &est, &xp, &lOrder, &version, &updated, &exCnt); err != nil {
			return err
		}
		if len(units) == 0 || units[len(units)-1].ID != u.ID {
			u.Lessons = []lessonBrief{}
			units = append(units, u)
		}
		if lID != nil {
			cur := &units[len(units)-1]
			cur.Lessons = append(cur.Lessons, lessonBrief{
				ID: *lID, Slug: *lSlug, Title: *lTitle, Status: *lStatus, Est: *est, XP: *xp,
				SortOrder: *lOrder, Version: *version, Exercises: *exCnt, UpdatedAt: *updated,
			})
		}
	}
	return httpx.OK(c, fiber.Map{"course": course, "units": units})
}

func (h *Handler) UpdateCourse(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r courseReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(false); err != nil {
		return err
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE courses SET slug=COALESCE($2,slug), title=COALESCE($3,title),
		  summary=CASE WHEN $4::text IS NULL THEN summary ELSE NULLIF($4,'') END,
		  status=COALESCE($5::content_status,status), sort_order=COALESCE($6,sort_order)
		WHERE id=$1`, id, r.Slug, r.Title, r.Summary, r.Status, r.SortOrder)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho khoá học khác")
	}
	if tag.RowsAffected() == 0 {
		return notFound("khoá học")
	}
	h.audit(c, "course.update", "course", id, r)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) DeleteCourse(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var title string
	var lessons int
	if err := h.db.QueryRow(c.Context(), `
		SELECT c.title, (SELECT count(*) FROM lessons l JOIN units u ON u.id=l.unit_id WHERE u.course_id=c.id)
		FROM courses c WHERE c.id=$1`, id).Scan(&title, &lessons); err != nil {
		return dbErr(c, err, "")
	}
	if _, err := h.db.Exec(c.Context(), `DELETE FROM courses WHERE id=$1`, id); err != nil {
		return dbErr(c, err, "")
	}
	h.audit(c, "course.delete", "course", id, fiber.Map{"title": title, "lessons": lessons})
	return httpx.OK(c, fiber.Map{"ok": true})
}

// ======================= Chương =======================

type unitReq struct {
	Slug    *string `json:"slug"`
	Title   *string `json:"title"`
	Summary *string `json:"summary"`
}

func (r *unitReq) validate(creating bool) error {
	if creating && (r.Slug == nil || r.Title == nil) {
		return bad("Cần nhập tiêu đề và đường dẫn của chương")
	}
	if r.Slug != nil {
		if err := checkSlug(*r.Slug); err != nil {
			return err
		}
	}
	if r.Title != nil {
		t, err := checkTitle(*r.Title)
		if err != nil {
			return err
		}
		r.Title = &t
	}
	return nil
}

func (h *Handler) CreateUnit(c *fiber.Ctx) error {
	courseID, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r unitReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(true); err != nil {
		return err
	}
	var id string
	err = h.db.QueryRow(c.Context(), `
		INSERT INTO units (course_id, slug, title, summary, sort_order)
		SELECT $1::uuid,$2::text,$3::text,NULLIF($4::text,''), (COALESCE(max(sort_order),0)+1)::smallint FROM units WHERE course_id=$1::uuid
		RETURNING id::text`, courseID, *r.Slug, *r.Title, deref(r.Summary)).Scan(&id)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho chương khác trong khoá học")
	}
	h.audit(c, "unit.create", "unit", id, fiber.Map{"title": *r.Title})
	return httpx.OK(c, fiber.Map{"id": id})
}

func (h *Handler) UpdateUnit(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r unitReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(false); err != nil {
		return err
	}
	tag, err := h.db.Exec(c.Context(), `
		UPDATE units SET slug=COALESCE($2,slug), title=COALESCE($3,title),
		  summary=CASE WHEN $4::text IS NULL THEN summary ELSE NULLIF($4,'') END
		WHERE id=$1`, id, r.Slug, r.Title, r.Summary)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho chương khác trong khoá học")
	}
	if tag.RowsAffected() == 0 {
		return notFound("chương")
	}
	h.audit(c, "unit.update", "unit", id, r)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) DeleteUnit(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var title string
	var lessons int
	if err := h.db.QueryRow(c.Context(), `
		SELECT title, (SELECT count(*) FROM lessons WHERE unit_id=units.id) FROM units WHERE id=$1`, id).Scan(&title, &lessons); err != nil {
		return dbErr(c, err, "")
	}
	if _, err := h.db.Exec(c.Context(), `DELETE FROM units WHERE id=$1`, id); err != nil {
		return dbErr(c, err, "")
	}
	h.audit(c, "unit.delete", "unit", id, fiber.Map{"title": title, "lessons": lessons})
	return httpx.OK(c, fiber.Map{"ok": true})
}

type reorderReq struct {
	IDs []string `json:"ids"`
}

func (r *reorderReq) validate() error {
	if len(r.IDs) == 0 || len(r.IDs) > 500 {
		return bad("Danh sách sắp xếp không hợp lệ")
	}
	for _, id := range r.IDs {
		if !uuidRe.MatchString(id) {
			return bad("Danh sách sắp xếp không hợp lệ")
		}
	}
	return nil
}

func (h *Handler) ReorderUnits(c *fiber.Ctx) error {
	courseID, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r reorderReq
	if err := c.BodyParser(&r); err != nil || r.validate() != nil {
		return bad("Danh sách sắp xếp không hợp lệ")
	}
	if _, err := h.db.Exec(c.Context(), `
		UPDATE units SET sort_order = x.ord::smallint
		FROM unnest($1::text[]) WITH ORDINALITY AS x(id, ord)
		WHERE units.id = x.id::uuid AND units.course_id = $2`, r.IDs, courseID); err != nil {
		return err
	}
	h.audit(c, "unit.reorder", "course", courseID, nil)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) ReorderLessons(c *fiber.Ctx) error {
	unitID, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r reorderReq
	if err := c.BodyParser(&r); err != nil || r.validate() != nil {
		return bad("Danh sách sắp xếp không hợp lệ")
	}
	if _, err := h.db.Exec(c.Context(), `
		UPDATE lessons SET sort_order = x.ord::smallint, updated_at = now()
		FROM unnest($1::text[]) WITH ORDINALITY AS x(id, ord)
		WHERE lessons.id = x.id::uuid AND lessons.unit_id = $2`, r.IDs, unitID); err != nil {
		return err
	}
	h.audit(c, "lesson.reorder", "unit", unitID, nil)
	return httpx.OK(c, fiber.Map{"ok": true})
}

// ======================= Bài học =======================

type lessonFull struct {
	ID          string          `json:"id"`
	UnitID      string          `json:"unit_id"`
	UnitTitle   string          `json:"unit_title"`
	CourseID    string          `json:"course_id"`
	CourseTitle string          `json:"course_title"`
	SubjectSlug string          `json:"subject_slug"`
	Slug        string          `json:"slug"`
	Title       string          `json:"title"`
	Summary     *string         `json:"summary"`
	Est         int             `json:"est_minutes"`
	XP          int             `json:"xp_reward"`
	Status      string          `json:"status"`
	Version     int             `json:"version"`
	PublishedAt *time.Time      `json:"published_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	Content     json.RawMessage `json:"content"`
	Problems    []string        `json:"problems"`
}

type unitOption struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// GET /admin/lessons/:id — toàn bộ bài (kèm đáp án) để soạn.
func (h *Handler) GetLesson(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var l lessonFull
	err = h.db.QueryRow(c.Context(), `
		SELECT l.id::text, l.unit_id::text, u.title, c.id::text, c.title, s.slug, l.slug, l.title, l.summary,
		       l.est_minutes, l.xp_reward, l.status::text, l.version, l.published_at, l.updated_at, l.content
		FROM lessons l JOIN units u ON u.id=l.unit_id JOIN courses c ON c.id=u.course_id JOIN subjects s ON s.id=c.subject_id
		WHERE l.id=$1`, id).Scan(&l.ID, &l.UnitID, &l.UnitTitle, &l.CourseID, &l.CourseTitle, &l.SubjectSlug, &l.Slug,
		&l.Title, &l.Summary, &l.Est, &l.XP, &l.Status, &l.Version, &l.PublishedAt, &l.UpdatedAt, &l.Content)
	if err != nil {
		return dbErr(c, err, "")
	}
	blocks, _ := parseBlocks(l.Content)
	l.Problems = problems(&content.Lesson{Slug: l.Slug, Title: l.Title, Status: l.Status, EstMinutes: l.Est, Blocks: blocks})

	rows, err := h.db.Query(c.Context(), `SELECT id::text, title FROM units WHERE course_id=$1 ORDER BY sort_order`, l.CourseID)
	if err != nil {
		return err
	}
	defer rows.Close()
	units := []unitOption{}
	for rows.Next() {
		var u unitOption
		if err := rows.Scan(&u.ID, &u.Title); err != nil {
			return err
		}
		units = append(units, u)
	}
	return httpx.OK(c, fiber.Map{"lesson": l, "units": units})
}

func parseBlocks(raw []byte) ([]map[string]any, error) {
	var doc struct {
		Blocks []map[string]any `json:"blocks"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		return nil, err
	}
	return doc.Blocks, nil
}

func problems(l *content.Lesson) []string {
	out := []string{}
	for _, e := range l.Validate() {
		out = append(out, e.Error())
	}
	return out
}

type lessonReq struct {
	UnitID  *string `json:"unit_id"`
	Slug    *string `json:"slug"`
	Title   *string `json:"title"`
	Summary *string `json:"summary"`
	Est     *int    `json:"est_minutes"`
	XP      *int    `json:"xp_reward"`
}

func (r *lessonReq) validate(creating bool) error {
	if creating && (r.Slug == nil || r.Title == nil) {
		return bad("Cần nhập tiêu đề và đường dẫn của bài học")
	}
	if r.Slug != nil {
		if err := checkSlug(*r.Slug); err != nil {
			return err
		}
	}
	if r.Title != nil {
		t, err := checkTitle(*r.Title)
		if err != nil {
			return err
		}
		r.Title = &t
	}
	if r.UnitID != nil && !uuidRe.MatchString(*r.UnitID) {
		return bad("Chương không hợp lệ")
	}
	if r.Est != nil && (*r.Est < 0 || *r.Est > 30) {
		return bad("Thời lượng phải từ 0 đến 30 phút")
	}
	if r.XP != nil && (*r.XP < 0 || *r.XP > 1000) {
		return bad("Điểm XP phải từ 0 đến 1000")
	}
	return nil
}

const starterContent = `{"schema":1,"blocks":[
 {"id":"b1","type":"mascot_say","text":"Chào bạn! Hôm nay mình cùng học bài mới nhé!"},
 {"id":"b-tong-ket","type":"summary","markdown":"- Điều cần nhớ 1\n- Điều cần nhớ 2"}
]}`

func (h *Handler) CreateLesson(c *fiber.Ctx) error {
	unitID, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r lessonReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(true); err != nil {
		return err
	}
	est, xp := 5, 20
	if r.Est != nil {
		est = *r.Est
	}
	if r.XP != nil {
		xp = *r.XP
	}
	var id string
	err = h.db.QueryRow(c.Context(), `
		INSERT INTO lessons (unit_id, slug, title, summary, est_minutes, xp_reward, sort_order, content, author_id)
		SELECT $1::uuid,$2::text,$3::text,NULLIF($4::text,''),$5::smallint,$6::smallint, (COALESCE(max(sort_order),0)+1)::smallint, $7::jsonb, $8::uuid FROM lessons WHERE unit_id=$1::uuid
		RETURNING id::text`, unitID, *r.Slug, *r.Title, deref(r.Summary), est, xp, starterContent, auth.UserID(c)).Scan(&id)
	if err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho bài học khác")
	}
	h.audit(c, "lesson.create", "lesson", id, fiber.Map{"slug": *r.Slug, "title": *r.Title})
	return httpx.OK(c, fiber.Map{"id": id})
}

func (h *Handler) UpdateLesson(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r lessonReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := r.validate(false); err != nil {
		return err
	}
	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())

	var curUnit string
	if err := tx.QueryRow(c.Context(), `SELECT unit_id::text FROM lessons WHERE id=$1 FOR UPDATE`, id).Scan(&curUnit); err != nil {
		return dbErr(c, err, "")
	}
	if r.UnitID != nil && *r.UnitID != curUnit {
		var ok bool
		if err := tx.QueryRow(c.Context(), `SELECT EXISTS (SELECT 1 FROM units WHERE id=$1)`, *r.UnitID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return bad("Chương không tồn tại")
		}
		if _, err := tx.Exec(c.Context(), `
			UPDATE lessons SET unit_id=$2, sort_order=(SELECT COALESCE(max(sort_order),0)+1 FROM lessons WHERE unit_id=$2) WHERE id=$1`,
			id, *r.UnitID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(c.Context(), `
		UPDATE lessons SET slug=COALESCE($2,slug), title=COALESCE($3,title),
		  summary=CASE WHEN $4::text IS NULL THEN summary ELSE NULLIF($4,'') END,
		  est_minutes=COALESCE($5,est_minutes), xp_reward=COALESCE($6,xp_reward), updated_at=now()
		WHERE id=$1`, id, r.Slug, r.Title, r.Summary, r.Est, r.XP); err != nil {
		return dbErr(c, err, "Đường dẫn này đã được dùng cho bài học khác")
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	h.audit(c, "lesson.update", "lesson", id, r)
	return httpx.OK(c, fiber.Map{"ok": true})
}

type contentReq struct {
	Blocks  []map[string]any `json:"blocks"`
	Version *int             `json:"version"`
}

func unprocessable(c *fiber.Ctx, msg string, details []string) error {
	return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": fiber.Map{
		"code": "VALIDATION_FAILED", "message": msg, "details": details,
	}})
}

func summarize(errs []string) string {
	if len(errs) > 5 {
		return strings.Join(errs[:5], "; ") + fmt.Sprintf("; … và %d lỗi khác", len(errs)-5)
	}
	return strings.Join(errs, "; ")
}

// PUT /admin/lessons/:id/content — lưu nội dung. Bản nháp luôn lưu được (kèm danh sách cảnh báo);
// bài đã xuất bản phải hợp lệ mới cho lưu. `version` chống ghi đè khi hai người cùng sửa.
func (h *Handler) SaveContent(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r contentReq
	if err := c.BodyParser(&r); err != nil || r.Blocks == nil {
		return bad("Nội dung không hợp lệ")
	}
	if len(r.Blocks) > 300 {
		return bad("Một bài học tối đa 300 khối nội dung")
	}
	for i, b := range r.Blocks {
		if b == nil {
			return bad(fmt.Sprintf("Khối #%d không hợp lệ", i+1))
		}
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())

	l := content.Lesson{Blocks: r.Blocks}
	var version int
	if err := tx.QueryRow(c.Context(),
		`SELECT slug, title, status::text, est_minutes, version FROM lessons WHERE id=$1 FOR UPDATE`, id).
		Scan(&l.Slug, &l.Title, &l.Status, &l.EstMinutes, &version); err != nil {
		return dbErr(c, err, "")
	}
	if r.Version != nil && *r.Version != version {
		return conflict(c, "Bài học vừa được người khác chỉnh sửa. Hãy tải lại trang để lấy bản mới nhất.")
	}
	probs := problems(&l)
	if l.Status == "published" && len(probs) > 0 {
		return unprocessable(c, "Bài đang xuất bản nên nội dung phải hợp lệ: "+summarize(probs), probs)
	}

	doc, err := json.Marshal(fiber.Map{"schema": 1, "blocks": r.Blocks})
	if err != nil {
		return err
	}
	if err := tx.QueryRow(c.Context(), `
		UPDATE lessons SET content=$2::jsonb, version=version+1, updated_at=now(), author_id=COALESCE(author_id,$3)
		WHERE id=$1 RETURNING version`, id, string(doc), auth.UserID(c)).Scan(&version); err != nil {
		return err
	}
	n, err := content.SyncExercises(c.Context(), tx, id, r.Blocks)
	if err != nil {
		return err
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	h.audit(c, "lesson.save_content", "lesson", id, fiber.Map{"version": version, "blocks": len(r.Blocks)})
	return httpx.OK(c, fiber.Map{"version": version, "exercises": n, "problems": probs})
}

type statusReq struct {
	Status string `json:"status"`
}

// POST /admin/lessons/:id/status — đổi trạng thái (draft/review/published/archived). Xuất bản phải qua kiểm tra nội dung.
func (h *Handler) SetLessonStatus(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var r statusReq
	if err := c.BodyParser(&r); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if err := checkStatus(r.Status); err != nil {
		return err
	}
	var l content.Lesson
	var raw []byte
	if err := h.db.QueryRow(c.Context(),
		`SELECT slug, title, est_minutes, content FROM lessons WHERE id=$1`, id).Scan(&l.Slug, &l.Title, &l.EstMinutes, &raw); err != nil {
		return dbErr(c, err, "")
	}
	if r.Status == "published" {
		l.Status = "published"
		l.Blocks, _ = parseBlocks(raw)
		if probs := problems(&l); len(probs) > 0 {
			return unprocessable(c, "Chưa thể xuất bản: "+summarize(probs), probs)
		}
	}
	if _, err := h.db.Exec(c.Context(), `
		UPDATE lessons SET status=$2::content_status,
		  published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE NULL END,
		  updated_at = now()
		WHERE id=$1`, id, r.Status); err != nil {
		return err
	}
	h.audit(c, "lesson.status", "lesson", id, fiber.Map{"status": r.Status})
	return httpx.OK(c, fiber.Map{"ok": true})
}

// POST /admin/lessons/:id/duplicate — nhân bản thành bản nháp.
func (h *Handler) DuplicateLesson(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())

	var unitID, slug, title string
	var raw []byte
	if err := tx.QueryRow(c.Context(), `SELECT unit_id::text, slug, title, content FROM lessons WHERE id=$1`, id).
		Scan(&unitID, &slug, &title, &raw); err != nil {
		return dbErr(c, err, "")
	}
	newSlug := slug + "-copy"
	for i := 2; ; i++ {
		var exists bool
		if err := tx.QueryRow(c.Context(), `SELECT EXISTS (SELECT 1 FROM lessons WHERE slug=$1)`, newSlug).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			break
		}
		newSlug = fmt.Sprintf("%s-copy-%d", slug, i)
	}
	var newID string
	if err := tx.QueryRow(c.Context(), `
		INSERT INTO lessons (unit_id, slug, title, summary, est_minutes, xp_reward, sort_order, content, author_id)
		SELECT unit_id, $2::text, $3::text, summary, est_minutes, xp_reward,
		       (SELECT max(sort_order)+1 FROM lessons WHERE unit_id=$4::uuid), content, $5::uuid
		FROM lessons WHERE id=$1 RETURNING id::text`, id, newSlug, title+" (bản sao)", unitID, auth.UserID(c)).Scan(&newID); err != nil {
		return err
	}
	blocks, _ := parseBlocks(raw)
	if _, err := content.SyncExercises(c.Context(), tx, newID, blocks); err != nil {
		return err
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	h.audit(c, "lesson.duplicate", "lesson", newID, fiber.Map{"from": id})
	return httpx.OK(c, fiber.Map{"id": newID})
}

func (h *Handler) DeleteLesson(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var title, slug string
	if err := h.db.QueryRow(c.Context(), `SELECT title, slug FROM lessons WHERE id=$1`, id).Scan(&title, &slug); err != nil {
		if err == pgx.ErrNoRows {
			return notFound("bài học")
		}
		return err
	}
	if _, err := h.db.Exec(c.Context(), `DELETE FROM lessons WHERE id=$1`, id); err != nil {
		return dbErr(c, err, "")
	}
	h.audit(c, "lesson.delete", "lesson", id, fiber.Map{"title": title, "slug": slug})
	return httpx.OK(c, fiber.Map{"ok": true})
}
