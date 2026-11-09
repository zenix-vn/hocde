package auth

import (
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/hocde/api/internal/config"
)

func testCfg(google bool) config.Config {
	c := config.Config{
		PublicURL: "https://hocde.vn", JWTSecret: "test-secret",
		AccessTTL: time.Minute, RefreshTTL: time.Hour,
	}
	if google {
		c.GoogleClientID, c.GoogleClientSecret = "cid.apps.googleusercontent.com", "sec"
	}
	return c
}

func newApp(cfg config.Config) *fiber.App {
	app := fiber.New()
	NewHandler(cfg, nil, NewManager(cfg.JWTSecret, cfg.AccessTTL)).Register(app.Group("/api/v1"))
	return app
}

func get(t *testing.T, app *fiber.App, path string, cookies ...string) (int, string, []string) {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	for _, c := range cookies {
		req.Header.Add("Cookie", c)
	}
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	return res.StatusCode, res.Header.Get("Location"), res.Header.Values("Set-Cookie")
}

func TestAccessTokenRoundTripAndAudience(t *testing.T) {
	m := NewManager("s", time.Minute)
	a, _ := m.NewAccess("user-1", "parent")
	c, err := m.ParseAccess(a)
	if err != nil || c.Subject != "user-1" || c.Role != "parent" {
		t.Fatalf("parse access: %v %+v", err, c)
	}
	// state token không được dùng làm access token
	st, _ := m.NewState(StateClaims{State: "x"})
	if _, err := m.ParseAccess(st); err == nil {
		t.Fatal("state token accepted as access token")
	}
	// access token không được dùng làm state
	if _, err := m.ParseState(a); err == nil {
		t.Fatal("access token accepted as state")
	}
	// sai secret
	if _, err := NewManager("other", time.Minute).ParseAccess(a); err == nil {
		t.Fatal("token with wrong secret accepted")
	}
	// hết hạn
	old := NewManager("s", -time.Minute)
	e, _ := old.NewAccess("u", "parent")
	if _, err := m.ParseAccess(e); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestStartNotConfigured(t *testing.T) {
	code, loc, _ := get(t, newApp(testCfg(false)), "/api/v1/auth/google/start")
	if code != 302 || loc != "https://hocde.vn/dang-nhap?error=not_configured" {
		t.Fatalf("got %d %s", code, loc)
	}
}

func TestStartSignupRequiresConsent(t *testing.T) {
	code, loc, _ := get(t, newApp(testCfg(true)), "/api/v1/auth/google/start?mode=signup")
	if code != 302 || loc != "https://hocde.vn/dang-ky?error=consent_required" {
		t.Fatalf("got %d %s", code, loc)
	}
}

func TestStartRedirectsToGoogleWithPKCE(t *testing.T) {
	code, loc, cookies := get(t, newApp(testCfg(true)), "/api/v1/auth/google/start?mode=signup&consent=1&next=/hoc")
	if code != 302 {
		t.Fatalf("status %d", code)
	}
	u, _ := url.Parse(loc)
	q := u.Query()
	if u.Host != "accounts.google.com" || q.Get("code_challenge_method") != "S256" ||
		q.Get("code_challenge") == "" || q.Get("state") == "" || q.Get("nonce") == "" ||
		q.Get("redirect_uri") != "https://hocde.vn/api/v1/auth/google/callback" ||
		q.Get("client_id") != "cid.apps.googleusercontent.com" || !strings.Contains(q.Get("scope"), "openid") {
		t.Fatalf("bad auth url: %s", loc)
	}
	joined := strings.ToLower(strings.Join(cookies, ";"))
	if !strings.Contains(joined, "hd_oauth=") || !strings.Contains(joined, "httponly") || !strings.Contains(joined, "secure") {
		t.Fatalf("state cookie not hardened: %v", cookies)
	}
}

func TestCallbackRejectsMissingOrForgedState(t *testing.T) {
	app := newApp(testCfg(true))
	// không có cookie state
	if code, loc, _ := get(t, app, "/api/v1/auth/google/callback?state=a&code=b"); code != 302 || !strings.Contains(loc, "error=state") {
		t.Fatalf("no cookie: %d %s", code, loc)
	}
	// cookie hợp lệ nhưng state trong query không khớp
	m := NewManager("test-secret", time.Minute)
	signed, _ := m.NewState(StateClaims{State: "real", Nonce: "n", Verifier: "v", Mode: "login", Next: "/hoc"})
	if code, loc, _ := get(t, app, "/api/v1/auth/google/callback?state=forged&code=b", "hd_oauth="+signed); code != 302 || !strings.Contains(loc, "error=state") {
		t.Fatalf("forged state: %d %s", code, loc)
	}
	// người dùng bấm huỷ ở Google
	if code, loc, _ := get(t, app, "/api/v1/auth/google/callback?error=access_denied", "hd_oauth="+signed); code != 302 || !strings.Contains(loc, "error=cancelled") {
		t.Fatalf("cancelled: %d %s", code, loc)
	}
}

func TestMeRequiresAuth(t *testing.T) {
	app := newApp(testCfg(true))
	if code, _, _ := get(t, app, "/api/v1/me"); code != 401 {
		t.Fatalf("expected 401, got %d", code)
	}
	if code, _, _ := get(t, app, "/api/v1/me", "hd_access=garbage"); code != 401 {
		t.Fatalf("expected 401 for garbage, got %d", code)
	}
}

func TestSafeNext(t *testing.T) {
	for in, want := range map[string]string{
		"": "/hoc", "/hoc": "/hoc", "/hoc/bai/1?x=1": "/hoc/bai/1?x=1",
		"//evil.com": "/hoc", "https://evil.com": "/hoc", "/\\evil.com": "/hoc", "/a\r\nb": "/hoc",
	} {
		if got := safeNext(in); got != want {
			t.Errorf("safeNext(%q)=%q want %q", in, got, want)
		}
	}
}
