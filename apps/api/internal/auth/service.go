package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ConsentVersion: phiên bản điều khoản/chính sách mà phụ huynh đã đồng ý.
const ConsentVersion = "2026-11"

var (
	ErrConsentRequired = errors.New("consent required")
	ErrInvalidSession  = errors.New("invalid session")
	ErrConflict        = errors.New("account conflict")
	ErrDisabled        = errors.New("account disabled")
)

type User struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	FullName  string  `json:"full_name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url"`
	HasPIN    bool    `json:"has_pin"`
}

type Service struct {
	db         *pgxpool.Pool
	refreshTTL time.Duration
}

func NewService(db *pgxpool.Pool, refreshTTL time.Duration) *Service {
	return &Service{db: db, refreshTTL: refreshTTL}
}

const userCols = `id::text, email::text, full_name, role::text, avatar_url, (parent_pin_hash IS NOT NULL)`

func scanUser(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.AvatarURL, &u.HasPIN)
	return u, err
}

func (s *Service) GetUser(ctx context.Context, id string) (User, error) {
	return scanUser(s.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id=$1 AND deleted_at IS NULL AND disabled_at IS NULL`, id))
}

// UpsertGoogleUser đăng nhập (hoặc tạo mới nếu consent=true) tài khoản phụ huynh theo Google.
// Chỉ tạo tài khoản mới khi phụ huynh đã đồng ý điều khoản.
func (s *Service) UpsertGoogleUser(ctx context.Context, sub, email, name, picture string, consent bool) (User, error) {
	var avatar *string
	if picture != "" {
		avatar = &picture
	}
	email = strings.ToLower(strings.TrimSpace(email))

	var disabled bool
	_ = s.db.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM users WHERE (google_sub=$1 OR email=$2) AND deleted_at IS NULL AND disabled_at IS NOT NULL)`,
		sub, email).Scan(&disabled)
	if disabled {
		return User{}, ErrDisabled
	}

	// 1) đã liên kết Google
	u, err := scanUser(s.db.QueryRow(ctx,
		`UPDATE users SET last_login_at=now(), avatar_url=COALESCE($2,avatar_url)
		 WHERE google_sub=$1 AND deleted_at IS NULL RETURNING `+userCols, sub, avatar))
	if err == nil {
		return u, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return User{}, err
	}

	// 2) đã có tài khoản cùng email (Google đã xác minh email) → liên kết
	u, err = scanUser(s.db.QueryRow(ctx,
		`UPDATE users SET google_sub=$2, avatar_url=COALESCE(avatar_url,$3), last_login_at=now(),
		        email_verified_at=COALESCE(email_verified_at,now())
		 WHERE email=$1 AND deleted_at IS NULL AND google_sub IS NULL RETURNING `+userCols, email, sub, avatar))
	if err == nil {
		return u, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return User{}, err
	}

	// 3) tài khoản mới – bắt buộc có đồng ý
	if !consent {
		return User{}, ErrConsentRequired
	}
	if strings.TrimSpace(name) == "" {
		name, _, _ = strings.Cut(email, "@")
	}
	u, err = scanUser(s.db.QueryRow(ctx,
		`INSERT INTO users (email, full_name, role, google_sub, avatar_url, email_verified_at,
		                    consent_at, consent_version, last_login_at)
		 VALUES ($1,$2,'parent',$3,$4,now(),now(),$5,now()) RETURNING `+userCols,
		email, name, sub, avatar, ConsentVersion))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrConflict
	}
	return u, err
}

// EnsureAdmin nâng quyền admin cho email nằm trong ADMIN_EMAILS (email đã được Google xác minh).
func (s *Service) EnsureAdmin(ctx context.Context, u User, adminEmails []string) (User, error) {
	if u.Role == "admin" {
		return u, nil
	}
	email := strings.ToLower(u.Email)
	for _, a := range adminEmails {
		if a == email {
			if _, err := s.db.Exec(ctx, `UPDATE users SET role='admin' WHERE id=$1`, u.ID); err != nil {
				return u, err
			}
			_, _ = s.db.Exec(ctx, `INSERT INTO audit_logs (actor_id, action, entity, entity_id, meta)
				VALUES ($1,'user.bootstrap_admin','user',$1::text,'{"via":"ADMIN_EMAILS"}')`, u.ID)
			u.Role = "admin"
			return u, nil
		}
	}
	return u, nil
}

// NewSession tạo refresh token mới (trả về giá trị thô để đặt vào cookie).
func (s *Service) NewSession(ctx context.Context, userID, userAgent string) (string, error) {
	return s.insertRefresh(ctx, s.db, userID, userAgent)
}

type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func (s *Service) insertRefresh(ctx context.Context, db execer, userID, ua string) (string, error) {
	tok, err := RandomToken()
	if err != nil {
		return "", err
	}
	if len(ua) > 300 {
		ua = ua[:300]
	}
	_, err = db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, user_agent, expires_at) VALUES ($1,$2,$3,$4)`,
		userID, HashToken(tok), ua, time.Now().Add(s.refreshTTL))
	return tok, err
}

// Rotate đổi refresh token cũ lấy token mới. Dùng lại token đã thu hồi (ngoài khoảng ân hạn
// 10 giây cho trường hợp nhiều tab) bị coi là bị đánh cắp → thu hồi mọi phiên của người dùng.
func (s *Service) Rotate(ctx context.Context, refresh, ua string) (User, string, error) {
	if refresh == "" {
		return User{}, "", ErrInvalidSession
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return User{}, "", err
	}
	defer tx.Rollback(ctx)

	var (
		id, userID string
		revokedAt  *time.Time
		expiresAt  time.Time
	)
	err = tx.QueryRow(ctx,
		`SELECT id::text, user_id::text, revoked_at, expires_at FROM refresh_tokens
		 WHERE token_hash=$1 FOR UPDATE`, HashToken(refresh)).Scan(&id, &userID, &revokedAt, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrInvalidSession
	}
	if err != nil {
		return User{}, "", err
	}
	if revokedAt != nil {
		if time.Since(*revokedAt) > 10*time.Second {
			_, _ = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL`, userID)
			_ = tx.Commit(ctx)
		}
		return User{}, "", ErrInvalidSession
	}
	if time.Now().After(expiresAt) {
		return User{}, "", ErrInvalidSession
	}
	if _, err = tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1`, id); err != nil {
		return User{}, "", err
	}
	u, err := scanUser(tx.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id=$1 AND deleted_at IS NULL AND disabled_at IS NULL`, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrInvalidSession
	}
	if err != nil {
		return User{}, "", err
	}
	next, err := s.insertRefresh(ctx, tx, userID, ua)
	if err != nil {
		return User{}, "", err
	}
	return u, next, tx.Commit(ctx)
}

func (s *Service) Revoke(ctx context.Context, refresh string) {
	if refresh == "" {
		return
	}
	_, _ = s.db.Exec(ctx, `UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`, HashToken(refresh))
}
