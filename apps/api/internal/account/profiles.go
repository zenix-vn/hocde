package account

import (
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/config"
	"github.com/hocde/api/internal/httpx"
)

const (
	MaxProfiles   = 5
	profileTTL    = 30 * 24 * time.Hour
	defaultAvatar = "fox"
)

var avatars = map[string]bool{
	"fox": true, "cat": true, "panda": true, "rabbit": true,
	"dino": true, "owl": true, "robot": true, "unicorn": true,
}

type Handler struct {
	db  *pgxpool.Pool
	tok *auth.Manager
	cfg config.Config
}

func NewHandler(cfg config.Config, db *pgxpool.Pool, tok *auth.Manager) *Handler {
	return &Handler{db: db, tok: tok, cfg: cfg}
}

func (h *Handler) Register(api fiber.Router) {
	req := auth.Require(h.tok)

	p := api.Group("/profiles", req) // middleware chỉ áp dụng cho /profiles*
	p.Get("/", h.List)
	p.Get("/active", h.Active)
	p.Post("/", h.Create)
	p.Patch("/:id", h.Update)
	p.Delete("/:id", h.Delete)
	p.Post("/:id/select", h.Select)

	api.Put("/me/pin", req, h.SetPIN)
	api.Post("/me/pin/verify", req, h.VerifyPIN)
	api.Post("/me/lock", req, h.Lock)
}

type Profile struct {
	ID               string `json:"id"`
	DisplayName      string `json:"display_name"`
	AvatarKey        string `json:"avatar_key"`
	Grade            int16  `json:"grade"`
	TotalXP          int    `json:"total_xp"`
	Stars            int    `json:"stars"`
	Level            int16  `json:"level"`
	CurrentStreak    int    `json:"current_streak"`
	DailyLimitMinute *int16 `json:"daily_limit_minutes"`
}

const profileCols = `id::text, display_name, avatar_key, grade, total_xp, stars, level, current_streak, daily_limit_minutes`

func scanProfile(row pgx.Row) (Profile, error) {
	var p Profile
	err := row.Scan(&p.ID, &p.DisplayName, &p.AvatarKey, &p.Grade, &p.TotalXP, &p.Stars, &p.Level, &p.CurrentStreak, &p.DailyLimitMinute)
	return p, err
}

type profileInput struct {
	DisplayName string `json:"display_name"`
	AvatarKey   string `json:"avatar_key"`
	Grade       int16  `json:"grade"`
}

// validate chuẩn hoá và kiểm tra dữ liệu hồ sơ. Trả thông báo lỗi tiếng Việt (rỗng nếu hợp lệ).
func (in *profileInput) validate() string {
	in.DisplayName = strings.Join(strings.Fields(in.DisplayName), " ")
	if n := utf8.RuneCountInString(in.DisplayName); n < 1 || n > 20 {
		return "Tên của bé cần từ 1 đến 20 ký tự"
	}
	for _, r := range in.DisplayName {
		if unicode.IsControl(r) || r == '<' || r == '>' {
			return "Tên của bé có ký tự không hợp lệ"
		}
	}
	if in.Grade < 1 || in.Grade > 9 {
		return "Lớp phải từ 1 đến 9"
	}
	if in.AvatarKey == "" {
		in.AvatarKey = defaultAvatar
	}
	if !avatars[in.AvatarKey] {
		return "Nhân vật không hợp lệ"
	}
	return ""
}

func bad(c *fiber.Ctx, msg string) error {
	return httpx.Fail(c, fiber.StatusBadRequest, "VALIDATION_FAILED", msg)
}

func (h *Handler) List(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(),
		`SELECT `+profileCols+` FROM profiles WHERE parent_id=$1 AND deleted_at IS NULL ORDER BY created_at`, auth.UserID(c))
	if err != nil {
		return err
	}
	defer rows.Close()
	out := []Profile{}
	for rows.Next() {
		p, err := scanProfile(rows)
		if err != nil {
			return err
		}
		out = append(out, p)
	}
	return httpx.OK(c, out)
}

// Active: hồ sơ đang học trên thiết bị này (cookie hd_profile), luôn kiểm tra thuộc về phụ huynh.
func (h *Handler) Active(c *fiber.Ctx) error {
	pid, err := h.tok.ParseScoped(c.Cookies(auth.CookieProfile), auth.AudProfile)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Chưa chọn hồ sơ")
	}
	p, err := scanProfile(h.db.QueryRow(c.Context(),
		`SELECT `+profileCols+` FROM profiles WHERE id=$1 AND parent_id=$2 AND deleted_at IS NULL`, pid, auth.UserID(c)))
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(fiber.StatusNotFound, "Chưa chọn hồ sơ")
	}
	if err != nil {
		return err
	}
	return httpx.OK(c, p)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	if err := h.requireUnlock(c); err != nil {
		return err
	}
	var in profileInput
	if err := c.BodyParser(&in); err != nil {
		return bad(c, "Dữ liệu không hợp lệ")
	}
	if msg := in.validate(); msg != "" {
		return bad(c, msg)
	}
	// chèn có điều kiện để tránh vượt giới hạn khi gọi song song
	p, err := scanProfile(h.db.QueryRow(c.Context(),
		`INSERT INTO profiles (parent_id, display_name, avatar_key, grade)
		 SELECT $1,$2,$3,$4
		 WHERE (SELECT count(*) FROM profiles WHERE parent_id=$1 AND deleted_at IS NULL) < $5
		 RETURNING `+profileCols, auth.UserID(c), in.DisplayName, in.AvatarKey, in.Grade, MaxProfiles))
	if errors.Is(err, pgx.ErrNoRows) {
		return httpx.Fail(c, fiber.StatusConflict, "LIMIT_REACHED", "Mỗi tài khoản tạo được tối đa 5 hồ sơ")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": p})
}

func (h *Handler) Update(c *fiber.Ctx) error {
	if err := h.requireUnlock(c); err != nil {
		return err
	}
	var in profileInput
	if err := c.BodyParser(&in); err != nil {
		return bad(c, "Dữ liệu không hợp lệ")
	}
	if msg := in.validate(); msg != "" {
		return bad(c, msg)
	}
	p, err := scanProfile(h.db.QueryRow(c.Context(),
		`UPDATE profiles SET display_name=$3, avatar_key=$4, grade=$5
		 WHERE id=$1 AND parent_id=$2 AND deleted_at IS NULL RETURNING `+profileCols,
		c.Params("id"), auth.UserID(c), in.DisplayName, in.AvatarKey, in.Grade))
	return h.one(c, p, err)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.requireUnlock(c); err != nil {
		return err
	}
	tag, err := h.db.Exec(c.Context(),
		`UPDATE profiles SET deleted_at=now() WHERE id=$1 AND parent_id=$2 AND deleted_at IS NULL`,
		c.Params("id"), auth.UserID(c))
	if err != nil {
		if isBadUUID(err) {
			return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy hồ sơ")
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy hồ sơ")
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) Select(c *fiber.Ctx) error {
	p, err := scanProfile(h.db.QueryRow(c.Context(),
		`SELECT `+profileCols+` FROM profiles WHERE id=$1 AND parent_id=$2 AND deleted_at IS NULL`,
		c.Params("id"), auth.UserID(c)))
	if err != nil {
		return h.one(c, p, err)
	}
	tok, err := h.tok.NewScoped(p.ID, auth.AudProfile, profileTTL)
	if err != nil {
		return err
	}
	h.setCookie(c, auth.CookieProfile, tok, "/", int(profileTTL.Seconds()))
	return httpx.OK(c, p)
}

func (h *Handler) one(c *fiber.Ctx, p Profile, err error) error {
	if errors.Is(err, pgx.ErrNoRows) || (err != nil && isBadUUID(err)) {
		return fiber.NewError(fiber.StatusNotFound, "Không tìm thấy hồ sơ")
	}
	if err != nil {
		return err
	}
	return httpx.OK(c, p)
}

func isBadUUID(err error) bool {
	return err != nil && strings.Contains(err.Error(), "SQLSTATE 22P02")
}

func (h *Handler) setCookie(c *fiber.Ctx, name, val, path string, maxAge int) {
	c.Cookie(&fiber.Cookie{
		Name: name, Value: val, Path: path, MaxAge: maxAge,
		HTTPOnly: true, Secure: h.cfg.SecureCookies(), SameSite: fiber.CookieSameSiteLaxMode,
	})
}
