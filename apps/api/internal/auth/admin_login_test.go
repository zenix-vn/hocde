package auth

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func testDB(t *testing.T) *pgxpool.Pool {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("đặt TEST_DATABASE_URL để chạy test tích hợp")
	}
	db, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	return db
}

func TestEnsureAdminAndDisabledLogin(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	svc := NewService(db, time.Hour)
	t.Cleanup(func() { _, _ = db.Exec(ctx, `DELETE FROM users WHERE email LIKE 'al-%@test.local'`) })

	u, err := svc.UpsertGoogleUser(ctx, "al-sub-1", "AL-Boss@Test.local", "Boss", "", true)
	if err != nil {
		t.Fatal(err)
	}
	if u.Role != "parent" {
		t.Fatalf("tài khoản mới phải là parent, được %s", u.Role)
	}
	// email không nằm trong danh sách → không đổi
	if got, _ := svc.EnsureAdmin(ctx, u, []string{"khac@test.local"}); got.Role != "parent" {
		t.Fatalf("không được cấp admin: %s", got.Role)
	}
	// khớp không phân biệt hoa thường → thành admin và lưu vào DB
	got, err := svc.EnsureAdmin(ctx, u, []string{"al-boss@test.local"})
	if err != nil || got.Role != "admin" {
		t.Fatalf("phải thành admin: %v %s", err, got.Role)
	}
	again, _ := svc.GetUser(ctx, u.ID)
	if again.Role != "admin" {
		t.Fatalf("DB chưa lưu role admin: %s", again.Role)
	}

	// khoá tài khoản → không đăng nhập được, không lấy được user, không xoay phiên
	refresh, err := svc.NewSession(ctx, u.ID, "test")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE users SET disabled_at=now() WHERE id=$1`, u.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UpsertGoogleUser(ctx, "al-sub-1", "al-boss@test.local", "Boss", "", false); !errors.Is(err, ErrDisabled) {
		t.Fatalf("muốn ErrDisabled, được %v", err)
	}
	if _, err := svc.GetUser(ctx, u.ID); err == nil {
		t.Fatal("GetUser phải lỗi với tài khoản bị khoá")
	}
	if _, _, err := svc.Rotate(ctx, refresh, "test"); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("Rotate phải từ chối phiên của tài khoản bị khoá: %v", err)
	}
}
