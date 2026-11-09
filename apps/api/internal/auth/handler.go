package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/hocde/api/internal/config"
	"github.com/hocde/api/internal/httpx"
)

const (
	cookieAccess  = "hd_access"
	cookieRefresh = "hd_refresh"
	cookieOAuth   = "hd_oauth"

	// CookieUnlock: đã nhập PIN phụ huynh. CookieProfile: hồ sơ con đang học trên thiết bị này.
	CookieUnlock  = "hd_unlock"
	CookieProfile = "hd_profile"
	AudUnlock     = "parent-unlock"
	AudProfile    = "profile"

	pathAuth   = "/api/v1/auth"
	pathOAuth  = "/api/v1/auth/google"
	defaultNxt = "/hoc"
)

type Handler struct {
	cfg    config.Config
	svc    *Service
	tok    *Manager
	oauth  *oauth2.Config
	mu     sync.Mutex
	prov   *oidc.Provider
	secure bool
}

func NewHandler(cfg config.Config, svc *Service, tok *Manager) *Handler {
	return &Handler{
		cfg: cfg, svc: svc, tok: tok, secure: cfg.SecureCookies(),
		oauth: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			Endpoint:     google.Endpoint,
			RedirectURL:  cfg.PublicURL + pathOAuth + "/callback",
			Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
		},
	}
}

func (h *Handler) Register(api fiber.Router) {
	g := api.Group("/auth")
	g.Get("/google/start", h.GoogleStart)
	g.Get("/google/callback", h.GoogleCallback)
	g.Post("/refresh", h.Refresh)
	g.Get("/session/renew", h.Renew)
	g.Post("/logout", h.Logout)
	api.Get("/me", Require(h.tok), h.Me)
}

// ---------- Google OAuth ----------

func (h *Handler) GoogleStart(c *fiber.Ctx) error {
	mode := "login"
	if c.Query("mode") == "signup" {
		mode = "signup"
	}
	if !h.cfg.GoogleEnabled() {
		return h.fail(c, mode, "not_configured")
	}
	consent := c.Query("consent") == "1"
	if mode == "signup" && !consent {
		return h.fail(c, mode, "consent_required")
	}

	state, err1 := RandomToken()
	nonce, err2 := RandomToken()
	if err := errors.Join(err1, err2); err != nil {
		return err
	}
	verifier := oauth2.GenerateVerifier()
	signed, err := h.tok.NewState(StateClaims{
		State: state, Nonce: nonce, Verifier: verifier, Mode: mode,
		Next: safeNext(c.Query("next")), Consent: consent && mode == "signup",
	})
	if err != nil {
		return err
	}
	h.setCookie(c, cookieOAuth, signed, pathOAuth, 600)

	u := h.oauth.AuthCodeURL(state,
		oauth2.S256ChallengeOption(verifier),
		oidc.Nonce(nonce),
		oauth2.SetAuthURLParam("prompt", "select_account"))
	return c.Redirect(u, fiber.StatusFound)
}

func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	st, err := h.tok.ParseState(c.Cookies(cookieOAuth))
	h.clearCookie(c, cookieOAuth, pathOAuth)
	if err != nil {
		return h.fail(c, "login", "state")
	}
	if c.Query("error") != "" {
		return h.fail(c, st.Mode, "cancelled")
	}
	if subtle.ConstantTimeCompare([]byte(c.Query("state")), []byte(st.State)) != 1 || c.Query("code") == "" {
		return h.fail(c, st.Mode, "state")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tok, err := h.oauth.Exchange(ctx, c.Query("code"), oauth2.VerifierOption(st.Verifier))
	if err != nil {
		return h.fail(c, st.Mode, "google_failed")
	}
	raw, _ := tok.Extra("id_token").(string)
	prov, err := h.provider(ctx)
	if err != nil || raw == "" {
		return h.fail(c, st.Mode, "google_failed")
	}
	idt, err := prov.Verifier(&oidc.Config{ClientID: h.cfg.GoogleClientID}).Verify(ctx, raw)
	if err != nil || subtle.ConstantTimeCompare([]byte(idt.Nonce), []byte(st.Nonce)) != 1 {
		return h.fail(c, st.Mode, "google_failed")
	}
	var cl struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := idt.Claims(&cl); err != nil || cl.Sub == "" || cl.Email == "" {
		return h.fail(c, st.Mode, "google_failed")
	}
	if !cl.EmailVerified {
		return h.fail(c, st.Mode, "unverified_email")
	}

	user, err := h.svc.UpsertGoogleUser(ctx, cl.Sub, cl.Email, cl.Name, cl.Picture, st.Consent)
	switch {
	case errors.Is(err, ErrConsentRequired):
		return h.fail(c, "signup", "no_account")
	case errors.Is(err, ErrConflict):
		return h.fail(c, st.Mode, "conflict")
	case err != nil:
		return h.fail(c, st.Mode, "server")
	}
	refresh, err := h.svc.NewSession(ctx, user.ID, c.Get("User-Agent"))
	if err != nil {
		return h.fail(c, st.Mode, "server")
	}
	if err := h.setSession(c, user, refresh); err != nil {
		return h.fail(c, st.Mode, "server")
	}
	return c.Redirect(h.cfg.PublicURL+st.Next, fiber.StatusFound)
}

func (h *Handler) provider(ctx context.Context) (*oidc.Provider, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.prov != nil {
		return h.prov, nil
	}
	p, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err == nil {
		h.prov = p
	}
	return p, err
}

// ---------- phiên ----------

func (h *Handler) Refresh(c *fiber.Ctx) error {
	user, next, err := h.svc.Rotate(c.Context(), c.Cookies(cookieRefresh), c.Get("User-Agent"))
	if err != nil {
		h.clearSession(c)
		if errors.Is(err, ErrInvalidSession) {
			return fiber.NewError(fiber.StatusUnauthorized, "Phiên đăng nhập đã hết hạn")
		}
		return err
	}
	if err := h.setSession(c, user, next); err != nil {
		return err
	}
	return httpx.OK(c, user)
}

// Renew: dùng cho Server Component khi access token hết hạn – đổi phiên rồi chuyển hướng lại.
func (h *Handler) Renew(c *fiber.Ctx) error {
	user, next, err := h.svc.Rotate(c.Context(), c.Cookies(cookieRefresh), c.Get("User-Agent"))
	if err != nil {
		h.clearSession(c)
		return c.Redirect(h.cfg.PublicURL+"/dang-nhap", fiber.StatusFound)
	}
	if err := h.setSession(c, user, next); err != nil {
		return c.Redirect(h.cfg.PublicURL+"/dang-nhap", fiber.StatusFound)
	}
	dest := safeNext(c.Query("next"))
	sep := "?"
	if strings.Contains(dest, "?") {
		sep = "&"
	}
	return c.Redirect(h.cfg.PublicURL+dest+sep+"renewed=1", fiber.StatusFound)
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	h.svc.Revoke(c.Context(), c.Cookies(cookieRefresh))
	h.clearSession(c)
	return httpx.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) Me(c *fiber.Ctx) error {
	u, err := h.svc.GetUser(c.Context(), UserID(c))
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "Cần đăng nhập")
	}
	sub, err := h.tok.ParseScoped(c.Cookies(CookieUnlock), AudUnlock)
	unlocked := err == nil && sub == u.ID
	return httpx.OK(c, fiber.Map{
		"id": u.ID, "email": u.Email, "full_name": u.FullName, "role": u.Role,
		"avatar_url": u.AvatarURL, "has_pin": u.HasPIN, "unlocked": unlocked,
	})
}

// ---------- middleware ----------

// Require yêu cầu access token hợp lệ (cookie hd_access hoặc header Bearer).
func Require(m *Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		raw := c.Cookies(cookieAccess)
		if raw == "" {
			if a := c.Get("Authorization"); strings.HasPrefix(a, "Bearer ") {
				raw = strings.TrimPrefix(a, "Bearer ")
			}
		}
		claims, err := m.ParseAccess(raw)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Cần đăng nhập")
		}
		c.Locals("uid", claims.Subject)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}

func UserID(c *fiber.Ctx) string { s, _ := c.Locals("uid").(string); return s }

// ---------- helpers ----------

func (h *Handler) setSession(c *fiber.Ctx, u User, refresh string) error {
	access, err := h.tok.NewAccess(u.ID, u.Role)
	if err != nil {
		return err
	}
	h.setCookie(c, cookieAccess, access, "/", int(h.cfg.AccessTTL.Seconds()))
	h.setCookie(c, cookieRefresh, refresh, pathAuth, int(h.cfg.RefreshTTL.Seconds()))
	return nil
}

func (h *Handler) clearSession(c *fiber.Ctx) {
	h.clearCookie(c, cookieAccess, "/")
	h.clearCookie(c, cookieRefresh, pathAuth)
	h.clearCookie(c, CookieUnlock, "/")
	h.clearCookie(c, CookieProfile, "/")
}

func (h *Handler) setCookie(c *fiber.Ctx, name, val, path string, maxAge int) {
	c.Cookie(&fiber.Cookie{
		Name: name, Value: val, Path: path, MaxAge: maxAge,
		HTTPOnly: true, Secure: h.secure, SameSite: fiber.CookieSameSiteLaxMode,
	})
}

func (h *Handler) clearCookie(c *fiber.Ctx, name, path string) {
	c.Cookie(&fiber.Cookie{
		Name: name, Value: "", Path: path, Expires: time.Unix(0, 0), MaxAge: -1,
		HTTPOnly: true, Secure: h.secure, SameSite: fiber.CookieSameSiteLaxMode,
	})
}

// fail chuyển người dùng về trang đăng nhập/đăng ký kèm mã lỗi thân thiện.
func (h *Handler) fail(c *fiber.Ctx, mode, code string) error {
	page := "/dang-nhap"
	if mode == "signup" {
		page = "/dang-ky"
	}
	return c.Redirect(h.cfg.PublicURL+page+"?error="+url.QueryEscape(code), fiber.StatusFound)
}

// safeNext chỉ cho phép đường dẫn nội bộ (chống open redirect).
func safeNext(n string) string {
	if n == "" || n[0] != '/' || strings.HasPrefix(n, "//") || strings.ContainsAny(n, "\\\r\n") {
		return defaultNxt
	}
	return n
}
