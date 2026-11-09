package content

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Result struct {
	Units, Lessons, Exercises int
}

// Import nhập (upsert) khoá học vào CSDL trong một transaction. Chạy lặp lại là an toàn:
// bài học khớp theo slug, bài tập khớp theo (lesson_id, block_key) nên không mất lịch sử làm bài.
func Import(ctx context.Context, db *pgxpool.Pool, c *Course) (Result, error) {
	var res Result
	tx, err := db.Begin(ctx)
	if err != nil {
		return res, err
	}
	defer tx.Rollback(ctx)

	var subjectID int16
	if err := tx.QueryRow(ctx, `SELECT id FROM subjects WHERE slug=$1`, c.Subject).Scan(&subjectID); err != nil {
		return res, fmt.Errorf("không tìm thấy môn %q: %w", c.Subject, err)
	}
	status := orDefault(c.Status, "draft")

	var courseID string
	err = tx.QueryRow(ctx, `
		INSERT INTO courses (subject_id, grade, slug, title, summary, status)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),$6::content_status)
		ON CONFLICT (subject_id, grade) DO UPDATE
		   SET slug=EXCLUDED.slug, title=EXCLUDED.title, summary=EXCLUDED.summary, status=EXCLUDED.status
		RETURNING id`, subjectID, c.Grade, c.Slug, c.Title, c.Summary, status).Scan(&courseID)
	if err != nil {
		return res, fmt.Errorf("courses: %w", err)
	}

	for ui, u := range c.Units {
		var unitID string
		err = tx.QueryRow(ctx, `
			INSERT INTO units (course_id, slug, title, summary, sort_order)
			VALUES ($1,$2,$3,NULLIF($4,''),$5)
			ON CONFLICT (course_id, slug) DO UPDATE
			   SET title=EXCLUDED.title, summary=EXCLUDED.summary, sort_order=EXCLUDED.sort_order
			RETURNING id`, courseID, u.Slug, u.Title, u.Summary, ui+1).Scan(&unitID)
		if err != nil {
			return res, fmt.Errorf("unit %q: %w", u.Slug, err)
		}
		res.Units++
		for li, l := range u.Lessons {
			n, err := importLesson(ctx, tx, unitID, li+1, l)
			if err != nil {
				return res, fmt.Errorf("%s: %w", l.File, err)
			}
			res.Lessons++
			res.Exercises += n
		}
	}
	return res, tx.Commit(ctx)
}

func importLesson(ctx context.Context, tx pgx.Tx, unitID string, order int, l *Lesson) (int, error) {
	doc, err := json.Marshal(map[string]any{"schema": 1, "blocks": l.Blocks})
	if err != nil {
		return 0, err
	}
	status := orDefault(l.Status, "draft")
	est := l.EstMinutes
	if est == 0 {
		est = 5
	}
	xp := l.XPReward
	if xp == 0 {
		xp = 20
	}

	var lessonID string
	err = tx.QueryRow(ctx, `
		INSERT INTO lessons (unit_id, slug, title, summary, est_minutes, xp_reward, sort_order, status, content, published_at)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8::content_status,$9::jsonb,
		        CASE WHEN $8 = 'published' THEN now() END)
		ON CONFLICT (slug) DO UPDATE SET
		   unit_id=EXCLUDED.unit_id, title=EXCLUDED.title, summary=EXCLUDED.summary,
		   est_minutes=EXCLUDED.est_minutes, xp_reward=EXCLUDED.xp_reward, sort_order=EXCLUDED.sort_order,
		   status=EXCLUDED.status,
		   version = lessons.version + CASE WHEN lessons.content IS DISTINCT FROM EXCLUDED.content THEN 1 ELSE 0 END,
		   content=EXCLUDED.content,
		   published_at = CASE WHEN EXCLUDED.status = 'published'
		                       THEN COALESCE(lessons.published_at, now()) ELSE NULL END,
		   updated_at=now()
		RETURNING id`,
		unitID, l.Slug, l.Title, l.Summary, est, xp, order, status, string(doc)).Scan(&lessonID)
	if err != nil {
		return 0, fmt.Errorf("lessons: %w", err)
	}

	n, err := SyncExercises(ctx, tx, lessonID, l.Blocks)
	if err != nil {
		return 0, err
	}
	return n, nil
}

// SyncExercises đồng bộ bảng exercises (đáp án) theo các block bài tập của bài học.
// Block thiếu id bị bỏ qua; bài tập đã gỡ khỏi nội dung bị xoá.
func SyncExercises(ctx context.Context, tx pgx.Tx, lessonID string, blocks []map[string]any) (int, error) {
	keys := []string{}
	for _, b := range blocks {
		if str(b["type"]) != "exercise" {
			continue
		}
		key := str(b["id"])
		if key == "" {
			continue
		}
		keys = append(keys, key)
		pts, _ := toInt(b["points"])
		key2 := map[string]any{"answer": b["answer"]}
		if e := str(b["explanation"]); e != "" {
			key2["explanation"] = e
		}
		ak, err := json.Marshal(key2)
		if err != nil {
			return 0, err
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO exercises (lesson_id, block_key, type, skill_tag, answer_key, points)
			VALUES ($1,$2,$3,NULLIF($4,''),$5::jsonb,$6)
			ON CONFLICT (lesson_id, block_key) DO UPDATE
			   SET type=EXCLUDED.type, skill_tag=EXCLUDED.skill_tag,
			       answer_key=EXCLUDED.answer_key, points=EXCLUDED.points`,
			lessonID, key, str(b["kind"]), str(b["skill"]), string(ak), pts)
		if err != nil {
			return 0, fmt.Errorf("exercise %s: %w", key, err)
		}
	}
	// xoá các bài tập đã bị gỡ khỏi file
	if _, err := tx.Exec(ctx,
		`DELETE FROM exercises WHERE lesson_id=$1 AND NOT (block_key = ANY($2))`, lessonID, keys); err != nil {
		return 0, err
	}
	return len(keys), nil
}

func orDefault(s, d string) string {
	if s == "" {
		return d
	}
	return s
}
