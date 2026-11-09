package account

import (
	"errors"
	"regexp"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/httpx"
)

const (
	unlockTTL   = 10 * time.Minute
	maxPinFails = 5
	pinLockFor  = 15 * time.Minute
)

var pinRe = regexp.MustCompile(`^[0-9]{4,6}$`)

type pinBody struct {
	PIN string `json:"pin"`
}

func (h *Handler) pinHash(c *fiber.Ctx) (*string, error) {
	var hash *string
	err := h.db.QueryRow(c.Context(), `SELECT parent_pin_hash FROM users WHERE id=$1 AND deleted_at IS NULL`, auth.UserID(c)).Scan(&hash)
	return hash, err
}

// requireUnlock: nếu phụ huynh đã đặt PIN thì thao tác quản lý cần cookie hd_unlock còn hạn.
func (h *Handler) requireUnlock(c *fiber.Ctx) error {
	hash, err := h.pinHash(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "Cần đăng nhập")
	}
	if hash == nil {
		return nil
	}
	if sub, err := h.tok.ParseScoped(c.Cookies(auth.CookieUnlock), auth.AudUnlock); err == nil && sub == auth.UserID(c) {
		return nil
	}
	return httpx.Fail(c, fiber.StatusForbidden, "PIN_REQUIRED", "Vui lòng nhập mã PIN phụ huynh")
}

// SetPIN: đặt PIN lần đầu, hoặc đổi PIN (cần đang ở trạng thái đã mở khoá).
func (h *Handler) SetPIN(c *fiber.Ctx) error {
	var in pinBody
	if err := c.BodyParser(&in); err != nil || !pinRe.MatchString(in.PIN) {
		return bad(c, "Mã PIN gồm 4 đến 6 chữ số")
	}
	if err := h.requireUnlock(c); err != nil {
		return err
	}
	hash, err := argon2id.CreateHash(in.PIN, argon2id.DefaultParams)
	if err != nil {
		return err
	}
	if _, err := h.db.Exec(c.Context(),
		`UPDATE users SET parent_pin_hash=$2, pin_failed_count=0, pin_locked_until=NULL WHERE id=$1`, auth.UserID(c), hash); err != nil {
		return err
	}
	if err := h.issueUnlock(c); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) VerifyPIN(c *fiber.Ctx) error {
	var in pinBody
	if err := c.BodyParser(&in); err != nil || !pinRe.MatchString(in.PIN) {
		return bad(c, "Mã PIN gồm 4 đến 6 chữ số")
	}
	uid := auth.UserID(c)

	var (
		hash   *string
		fails  int16
		locked *time.Time
	)
	err := h.db.QueryRow(c.Context(),
		`SELECT parent_pin_hash, pin_failed_count, pin_locked_until FROM users WHERE id=$1 AND deleted_at IS NULL`, uid).
		Scan(&hash, &fails, &locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return fiber.NewError(fiber.StatusUnauthorized, "Cần đăng nhập")
	}
	if err != nil {
		return err
	}
	if hash == nil {
		return httpx.Fail(c, fiber.StatusConflict, "PIN_NOT_SET", "Bạn chưa đặt mã PIN")
	}
	if locked != nil && time.Now().Before(*locked) {
		return httpx.Fail(c, fiber.StatusTooManyRequests, "PIN_LOCKED",
			"Nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.")
	}

	ok, err := argon2id.ComparePasswordAndHash(in.PIN, *hash)
	if err != nil {
		return err
	}
	if !ok {
		fails++
		if fails >= maxPinFails {
			_, err = h.db.Exec(c.Context(),
				`UPDATE users SET pin_failed_count=0, pin_locked_until=$2 WHERE id=$1`, uid, time.Now().Add(pinLockFor))
		} else {
			_, err = h.db.Exec(c.Context(), `UPDATE users SET pin_failed_count=$2 WHERE id=$1`, uid, fails)
		}
		if err != nil {
			return err
		}
		return httpx.Fail(c, fiber.StatusForbidden, "PIN_INVALID", "Mã PIN chưa đúng, thử lại nhé")
	}
	if _, err := h.db.Exec(c.Context(), `UPDATE users SET pin_failed_count=0, pin_locked_until=NULL WHERE id=$1`, uid); err != nil {
		return err
	}
	if err := h.issueUnlock(c); err != nil {
		return err
	}
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) Lock(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name: auth.CookieUnlock, Path: "/", Expires: time.Unix(0, 0), MaxAge: -1,
		HTTPOnly: true, Secure: h.cfg.SecureCookies(), SameSite: fiber.CookieSameSiteLaxMode,
	})
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) issueUnlock(c *fiber.Ctx) error {
	tok, err := h.tok.NewScoped(auth.UserID(c), auth.AudUnlock, unlockTTL)
	if err != nil {
		return err
	}
	h.setCookie(c, auth.CookieUnlock, tok, "/", int(unlockTTL.Seconds()))
	return nil
}
