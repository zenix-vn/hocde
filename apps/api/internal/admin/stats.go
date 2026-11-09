package admin

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/hocde/api/internal/httpx"
)

type dayPoint struct {
	Day         string `json:"day"`
	Signups     int    `json:"signups"`
	Completions int    `json:"completions"`
	Attempts    int    `json:"attempts"`
}

type lessonStat struct {
	ID    string   `json:"id"`
	Title string   `json:"title"`
	Slug  string   `json:"slug"`
	Count int      `json:"count"`
	Rate  *float64 `json:"rate,omitempty"`
}

// GET /admin/stats — số liệu tổng quan cho trang dashboard.
func (h *Handler) Stats(c *fiber.Ctx) error {
	ctx := c.Context()
	out := fiber.Map{}

	var users, parents, staff, disabled, new7, new30, profiles, active7 int
	if err := h.db.QueryRow(ctx, `
		SELECT count(*),
		       count(*) FILTER (WHERE role IN ('parent','teacher')),
		       count(*) FILTER (WHERE role IN ('admin','editor')),
		       count(*) FILTER (WHERE disabled_at IS NOT NULL),
		       count(*) FILTER (WHERE created_at > now() - interval '7 days'),
		       count(*) FILTER (WHERE created_at > now() - interval '30 days'),
		       (SELECT count(*) FROM profiles WHERE deleted_at IS NULL),
		       (SELECT count(*) FROM profiles WHERE deleted_at IS NULL AND last_active_date >= current_date - 6)
		FROM users WHERE deleted_at IS NULL`).Scan(&users, &parents, &staff, &disabled, &new7, &new30, &profiles, &active7); err != nil {
		return err
	}
	out["users"] = fiber.Map{
		"total": users, "parents": parents, "staff": staff, "disabled": disabled,
		"new_7d": new7, "new_30d": new30, "profiles": profiles, "active_profiles_7d": active7,
	}

	var courses, publishedCourses, lessons, pubLessons, draftLessons, reviewLessons, exercises int
	if err := h.db.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM courses),
		       (SELECT count(*) FROM courses WHERE status='published'),
		       count(*),
		       count(*) FILTER (WHERE status='published'),
		       count(*) FILTER (WHERE status='draft'),
		       count(*) FILTER (WHERE status='review'),
		       (SELECT count(*) FROM exercises)
		FROM lessons`).Scan(&courses, &publishedCourses, &lessons, &pubLessons, &draftLessons, &reviewLessons, &exercises); err != nil {
		return err
	}
	out["content"] = fiber.Map{
		"courses": courses, "published_courses": publishedCourses, "lessons": lessons,
		"published_lessons": pubLessons, "draft_lessons": draftLessons, "review_lessons": reviewLessons, "exercises": exercises,
	}

	var attempts7, correct7, completions7, minutes7 int
	if err := h.db.QueryRow(ctx, `
		SELECT (SELECT count(*) FROM attempts WHERE created_at > now() - interval '7 days'),
		       (SELECT count(*) FROM attempts WHERE created_at > now() - interval '7 days' AND is_correct),
		       (SELECT count(*) FROM lesson_progress WHERE completed_at > now() - interval '7 days'),
		       (SELECT COALESCE(sum(minutes_spent),0) FROM daily_activity WHERE day >= current_date - 6)`).
		Scan(&attempts7, &correct7, &completions7, &minutes7); err != nil {
		return err
	}
	var accuracy *float64
	if attempts7 > 0 {
		v := float64(correct7) / float64(attempts7)
		accuracy = &v
	}
	out["learning"] = fiber.Map{
		"attempts_7d": attempts7, "accuracy_7d": accuracy, "completions_7d": completions7, "minutes_7d": minutes7,
	}

	// chuỗi 14 ngày
	rows, err := h.db.Query(ctx, `
		SELECT d::date,
		  (SELECT count(*) FROM users WHERE deleted_at IS NULL AND created_at::date = d::date),
		  (SELECT count(*) FROM lesson_progress WHERE completed_at::date = d::date),
		  (SELECT count(*) FROM attempts WHERE created_at::date = d::date)
		FROM generate_series(current_date - 13, current_date, interval '1 day') d ORDER BY d`)
	if err != nil {
		return err
	}
	series := []dayPoint{}
	for rows.Next() {
		var d time.Time
		var p dayPoint
		if err := rows.Scan(&d, &p.Signups, &p.Completions, &p.Attempts); err != nil {
			rows.Close()
			return err
		}
		p.Day = d.Format("2006-01-02")
		series = append(series, p)
	}
	rows.Close()
	out["series"] = series

	top, err := h.lessonStats(c, `
		SELECT l.id::text, l.title, l.slug, count(*)::int, NULL::float8
		FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id
		WHERE lp.status='completed' GROUP BY l.id ORDER BY 4 DESC, l.title LIMIT 5`)
	if err != nil {
		return err
	}
	out["top_lessons"] = top

	hard, err := h.lessonStats(c, `
		SELECT l.id::text, l.title, l.slug, count(*)::int,
		       (count(*) FILTER (WHERE a.is_correct))::float8 / count(*)
		FROM attempts a JOIN exercises e ON e.id=a.exercise_id JOIN lessons l ON l.id=e.lesson_id
		GROUP BY l.id HAVING count(*) >= 5 ORDER BY 5 ASC, 4 DESC LIMIT 5`)
	if err != nil {
		return err
	}
	out["hardest_lessons"] = hard

	return httpx.OK(c, out)
}

func (h *Handler) lessonStats(c *fiber.Ctx, q string) ([]lessonStat, error) {
	rows, err := h.db.Query(c.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []lessonStat{}
	for rows.Next() {
		var s lessonStat
		if err := rows.Scan(&s.ID, &s.Title, &s.Slug, &s.Count, &s.Rate); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
