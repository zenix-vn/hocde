package admin

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/httpx"
)

var roles = map[string]bool{"parent": true, "teacher": true, "editor": true, "admin": true}

type userRow struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	FullName    string     `json:"full_name"`
	Role        string     `json:"role"`
	AvatarURL   *string    `json:"avatar_url"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at"`
	DisabledAt  *time.Time `json:"disabled_at"`
	Profiles    int        `json:"profiles"`
}

const userSelect = `SELECT u.id::text, u.email::text, u.full_name, u.role::text, u.avatar_url, u.created_at,
	u.last_login_at, u.disabled_at, (SELECT count(*) FROM profiles p WHERE p.parent_id=u.id AND p.deleted_at IS NULL)
	FROM users u`

func scanUserRow(row interface{ Scan(...any) error }) (userRow, error) {
	var u userRow
	err := row.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.AvatarURL, &u.CreatedAt, &u.LastLoginAt, &u.DisabledAt, &u.Profiles)
	return u, err
}

// GET /admin/users?q=&role=&status=active|disabled&page=&page_size=
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	p := paging(c)
	where := []string{"u.deleted_at IS NULL"}
	args := []any{}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		args = append(args, "%"+escapeLike(q)+"%")
		where = append(where, fmt.Sprintf("(u.email ILIKE $%d OR u.full_name ILIKE $%d)", len(args), len(args)))
	}
	if r := c.Query("role"); r != "" {
		if !roles[r] {
			return bad("Vai trò không hợp lệ")
		}
		args = append(args, r)
		where = append(where, fmt.Sprintf("u.role = $%d::user_role", len(args)))
	}
	switch c.Query("status") {
	case "active":
		where = append(where, "u.disabled_at IS NULL")
	case "disabled":
		where = append(where, "u.disabled_at IS NOT NULL")
	}
	cond := strings.Join(where, " AND ")

	var total int
	if err := h.db.QueryRow(c.Context(), `SELECT count(*) FROM users u WHERE `+cond, args...).Scan(&total); err != nil {
		return err
	}
	args = append(args, p.Size, p.Offset)
	rows, err := h.db.Query(c.Context(),
		userSelect+` WHERE `+cond+fmt.Sprintf(` ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []userRow{}
	for rows.Next() {
		u, err := scanUserRow(rows)
		if err != nil {
			return err
		}
		out = append(out, u)
	}
	return listOK(c, out, p, total)
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

type childRow struct {
	ID             string     `json:"id"`
	DisplayName    string     `json:"display_name"`
	AvatarKey      string     `json:"avatar_key"`
	Grade          int        `json:"grade"`
	TotalXP        int        `json:"total_xp"`
	Stars          int        `json:"stars"`
	Level          int        `json:"level"`
	CurrentStreak  int        `json:"current_streak"`
	LastActiveDate *time.Time `json:"last_active_date"`
	Completed      int        `json:"lessons_completed"`
	CreatedAt      time.Time  `json:"created_at"`
}

// GET /admin/users/:id — chi tiết tài khoản + các hồ sơ con.
func (h *Handler) GetUser(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	u, err := scanUserRow(h.db.QueryRow(c.Context(), userSelect+` WHERE u.id=$1 AND u.deleted_at IS NULL`, id))
	if err != nil {
		return dbErr(c, err, "")
	}
	var consentAt *time.Time
	var consentVer *string
	var hasPIN, google bool
	var sessions int
	if err := h.db.QueryRow(c.Context(), `
		SELECT consent_at, consent_version, parent_pin_hash IS NOT NULL, google_sub IS NOT NULL,
		       (SELECT count(*) FROM refresh_tokens r WHERE r.user_id=u.id AND r.revoked_at IS NULL AND r.expires_at>now())
		FROM users u WHERE id=$1`, id).Scan(&consentAt, &consentVer, &hasPIN, &google, &sessions); err != nil {
		return err
	}
	rows, err := h.db.Query(c.Context(), `
		SELECT p.id::text, p.display_name, p.avatar_key, p.grade, p.total_xp, p.stars, p.level, p.current_streak,
		       p.last_active_date, (SELECT count(*) FROM lesson_progress lp WHERE lp.profile_id=p.id AND lp.status='completed'),
		       p.created_at
		FROM profiles p WHERE p.parent_id=$1 AND p.deleted_at IS NULL ORDER BY p.created_at`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	kids := []childRow{}
	for rows.Next() {
		var k childRow
		if err := rows.Scan(&k.ID, &k.DisplayName, &k.AvatarKey, &k.Grade, &k.TotalXP, &k.Stars, &k.Level,
			&k.CurrentStreak, &k.LastActiveDate, &k.Completed, &k.CreatedAt); err != nil {
			return err
		}
		kids = append(kids, k)
	}
	return httpx.OK(c, fiber.Map{
		"user": u, "consent_at": consentAt, "consent_version": consentVer, "has_pin": hasPIN,
		"google_linked": google, "active_sessions": sessions, "children": kids,
	})
}

type updateUserReq struct {
	Role     *string `json:"role"`
	Disabled *bool   `json:"disabled"`
	FullName *string `json:"full_name"`
}

// PATCH /admin/users/:id — đổi vai trò, khoá/mở khoá, đổi tên.
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	var req updateUserReq
	if err := c.BodyParser(&req); err != nil {
		return bad("Yêu cầu không hợp lệ")
	}
	if req.Role != nil && !roles[*req.Role] {
		return bad("Vai trò không hợp lệ")
	}
	if req.FullName != nil {
		n := strings.TrimSpace(*req.FullName)
		if n == "" || len([]rune(n)) > 100 {
			return bad("Tên phải từ 1 đến 100 ký tự")
		}
		req.FullName = &n
	}
	self := id == auth.UserID(c)
	if self && ((req.Role != nil && *req.Role != "admin") || (req.Disabled != nil && *req.Disabled)) {
		return bad("Bạn không thể tự hạ quyền hoặc khoá chính mình")
	}

	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())

	var oldRole string
	var wasDisabled bool
	if err := tx.QueryRow(c.Context(),
		`SELECT role::text, disabled_at IS NOT NULL FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, id).
		Scan(&oldRole, &wasDisabled); err != nil {
		return dbErr(c, err, "")
	}
	losesAdmin := oldRole == "admin" && !wasDisabled &&
		((req.Role != nil && *req.Role != "admin") || (req.Disabled != nil && *req.Disabled))
	if losesAdmin {
		var others int
		if err := tx.QueryRow(c.Context(),
			`SELECT count(*) FROM users WHERE role='admin' AND disabled_at IS NULL AND deleted_at IS NULL AND id<>$1`, id).Scan(&others); err != nil {
			return err
		}
		if others == 0 {
			return conflict(c, "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động")
		}
	}

	if _, err := tx.Exec(c.Context(), `
		UPDATE users SET
		  role = COALESCE($2::user_role, role),
		  full_name = COALESCE($3, full_name),
		  disabled_at = CASE WHEN $4::bool IS NULL THEN disabled_at WHEN $4 THEN COALESCE(disabled_at, now()) ELSE NULL END,
		  updated_at = now()
		WHERE id=$1`, id, req.Role, req.FullName, req.Disabled); err != nil {
		return err
	}
	if req.Disabled != nil && *req.Disabled {
		if _, err := tx.Exec(c.Context(),
			`UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL`, id); err != nil {
			return err
		}
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	h.audit(c, "user.update", "user", id, fiber.Map{"role": req.Role, "disabled": req.Disabled, "full_name": req.FullName, "old_role": oldRole})
	return httpx.OK(c, fiber.Map{"ok": true})
}

// POST /admin/users/:id/revoke-sessions — buộc đăng xuất mọi thiết bị.
func (h *Handler) RevokeSessions(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	tag, err := h.db.Exec(c.Context(), `UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL`, id)
	if err != nil {
		return err
	}
	h.audit(c, "user.revoke_sessions", "user", id, fiber.Map{"count": tag.RowsAffected()})
	return httpx.OK(c, fiber.Map{"revoked": tag.RowsAffected()})
}

// DELETE /admin/users/:id — xoá vĩnh viễn tài khoản cùng hồ sơ con và tiến độ học (theo yêu cầu của phụ huynh).
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id, err := uuidParam(c, "id")
	if err != nil {
		return err
	}
	if id == auth.UserID(c) {
		return bad("Bạn không thể xoá chính mình")
	}
	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())

	var role, email string
	if err := tx.QueryRow(c.Context(), `SELECT role::text, email::text FROM users WHERE id=$1 FOR UPDATE`, id).Scan(&role, &email); err != nil {
		return dbErr(c, err, "")
	}
	if role == "admin" {
		var others int
		if err := tx.QueryRow(c.Context(),
			`SELECT count(*) FROM users WHERE role='admin' AND disabled_at IS NULL AND deleted_at IS NULL AND id<>$1`, id).Scan(&others); err != nil {
			return err
		}
		if others == 0 {
			return conflict(c, "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động")
		}
	}
	for _, q := range []string{
		`UPDATE lessons SET author_id=NULL WHERE author_id=$1`,
		`UPDATE media_assets SET uploaded_by=NULL WHERE uploaded_by=$1`,
		`DELETE FROM users WHERE id=$1`,
	} {
		if _, err := tx.Exec(c.Context(), q, id); err != nil {
			return err
		}
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	h.audit(c, "user.delete", "user", id, fiber.Map{"email": email, "role": role})
	return httpx.OK(c, fiber.Map{"ok": true})
}

type profileRow struct {
	childRow
	ParentID    string `json:"parent_id"`
	ParentEmail string `json:"parent_email"`
	ParentName  string `json:"parent_name"`
}

// GET /admin/profiles?q=&grade=&page= — danh sách hồ sơ học sinh (chỉ đọc).
func (h *Handler) ListProfiles(c *fiber.Ctx) error {
	p := paging(c)
	where := []string{"p.deleted_at IS NULL", "u.deleted_at IS NULL"}
	args := []any{}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		args = append(args, "%"+escapeLike(q)+"%")
		where = append(where, fmt.Sprintf("(p.display_name ILIKE $%d OR u.email ILIKE $%d)", len(args), len(args)))
	}
	if g := c.QueryInt("grade", 0); g >= 1 && g <= 9 {
		args = append(args, g)
		where = append(where, fmt.Sprintf("p.grade = $%d", len(args)))
	}
	cond := strings.Join(where, " AND ")
	from := ` FROM profiles p JOIN users u ON u.id=p.parent_id WHERE ` + cond

	var total int
	if err := h.db.QueryRow(c.Context(), `SELECT count(*)`+from, args...).Scan(&total); err != nil {
		return err
	}
	args = append(args, p.Size, p.Offset)
	rows, err := h.db.Query(c.Context(), `
		SELECT p.id::text, p.display_name, p.avatar_key, p.grade, p.total_xp, p.stars, p.level, p.current_streak,
		       p.last_active_date, (SELECT count(*) FROM lesson_progress lp WHERE lp.profile_id=p.id AND lp.status='completed'),
		       p.created_at, u.id::text, u.email::text, u.full_name`+from+
		fmt.Sprintf(` ORDER BY p.created_at DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []profileRow{}
	for rows.Next() {
		var r profileRow
		if err := rows.Scan(&r.ID, &r.DisplayName, &r.AvatarKey, &r.Grade, &r.TotalXP, &r.Stars, &r.Level, &r.CurrentStreak,
			&r.LastActiveDate, &r.Completed, &r.CreatedAt, &r.ParentID, &r.ParentEmail, &r.ParentName); err != nil {
			return err
		}
		out = append(out, r)
	}
	return listOK(c, out, p, total)
}

type auditRow struct {
	ID         int64     `json:"id"`
	ActorID    *string   `json:"actor_id"`
	ActorEmail *string   `json:"actor_email"`
	Action     string    `json:"action"`
	Entity     *string   `json:"entity"`
	EntityID   *string   `json:"entity_id"`
	Meta       any       `json:"meta"`
	CreatedAt  time.Time `json:"created_at"`
}

// GET /admin/audit?action=&page= — nhật ký thao tác quản trị.
func (h *Handler) ListAudit(c *fiber.Ctx) error {
	p := paging(c)
	args := []any{}
	cond := "TRUE"
	if a := strings.TrimSpace(c.Query("action")); a != "" {
		args = append(args, escapeLike(a)+"%")
		cond = "a.action LIKE $1"
	}
	var total int
	if err := h.db.QueryRow(c.Context(), `SELECT count(*) FROM audit_logs a WHERE `+cond, args...).Scan(&total); err != nil {
		return err
	}
	args = append(args, p.Size, p.Offset)
	rows, err := h.db.Query(c.Context(), `
		SELECT a.id, a.actor_id::text, u.email::text, a.action, a.entity, a.entity_id, a.meta, a.created_at
		FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE `+cond+
		fmt.Sprintf(` ORDER BY a.id DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []auditRow{}
	for rows.Next() {
		var r auditRow
		if err := rows.Scan(&r.ID, &r.ActorID, &r.ActorEmail, &r.Action, &r.Entity, &r.EntityID, &r.Meta, &r.CreatedAt); err != nil {
			return err
		}
		out = append(out, r)
	}
	return listOK(c, out, p, total)
}
