package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	issuer        = "hocde"
	audAccess     = "access"
	audOAuthState = "oauth-state"
)

// Manager ký và kiểm tra JWT (access token và state OAuth). Hai loại dùng audience khác nhau
// để token này không thể dùng thay token kia.
type Manager struct {
	secret    []byte
	accessTTL time.Duration
}

func NewManager(secret string, accessTTL time.Duration) *Manager {
	return &Manager{secret: []byte(secret), accessTTL: accessTTL}
}

type AccessClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type StateClaims struct {
	State    string `json:"st"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
	Mode     string `json:"m"`
	Next     string `json:"nx"`
	Consent  bool   `json:"c"`
	jwt.RegisteredClaims
}

func (m *Manager) reg(sub, aud string, ttl time.Duration) jwt.RegisteredClaims {
	now := time.Now()
	return jwt.RegisteredClaims{
		Issuer:    issuer,
		Subject:   sub,
		Audience:  jwt.ClaimStrings{aud},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}
}

func (m *Manager) sign(c jwt.Claims) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(m.secret)
}

func (m *Manager) parse(s string, dst jwt.Claims, aud string) error {
	_, err := jwt.ParseWithClaims(s, dst, func(*jwt.Token) (any, error) { return m.secret, nil },
		jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(issuer),
		jwt.WithAudience(aud), jwt.WithExpirationRequired())
	return err
}

func (m *Manager) NewAccess(userID, role string) (string, error) {
	return m.sign(AccessClaims{Role: role, RegisteredClaims: m.reg(userID, audAccess, m.accessTTL)})
}

func (m *Manager) ParseAccess(s string) (*AccessClaims, error) {
	var c AccessClaims
	if err := m.parse(s, &c, audAccess); err != nil {
		return nil, err
	}
	if c.Subject == "" {
		return nil, errors.New("missing subject")
	}
	return &c, nil
}

// NewScoped/ParseScoped: token ngắn gọn chỉ chứa subject, tách biệt bằng audience
// (VD "parent-unlock" = đã nhập PIN, "profile" = hồ sơ con đang học).
func (m *Manager) NewScoped(sub, aud string, ttl time.Duration) (string, error) {
	return m.sign(m.reg(sub, aud, ttl))
}

func (m *Manager) ParseScoped(s, aud string) (string, error) {
	var c jwt.RegisteredClaims
	if err := m.parse(s, &c, aud); err != nil {
		return "", err
	}
	return c.Subject, nil
}

func (m *Manager) NewState(c StateClaims) (string, error) {
	c.RegisteredClaims = m.reg("", audOAuthState, 10*time.Minute)
	return m.sign(c)
}

func (m *Manager) ParseState(s string) (*StateClaims, error) {
	var c StateClaims
	if err := m.parse(s, &c, audOAuthState); err != nil {
		return nil, err
	}
	return &c, nil
}

// RandomToken trả về chuỗi ngẫu nhiên 256-bit (base64url).
func RandomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HashToken: refresh token chỉ lưu dạng hash trong DB.
func HashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}
