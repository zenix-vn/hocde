package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hocde/api/internal/auth"
	"github.com/hocde/api/internal/httpx"
)

// Chạy với: TEST_DATABASE_URL=postgres://... go test ./internal/admin
// (CSDL đã áp dụng đủ migration; test tự dọn dữ liệu nó tạo ra).

type env struct {
	t   *testing.T
	app *fiber.App
	db  *pgxpool.Pool
	tok *auth.Manager
}

func setup(t *testing.T) *env {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("đặt TEST_DATABASE_URL để chạy test tích hợp")
	}
	db, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	tok := auth.NewManager("test-secret", time.Minute)
	app := fiber.New(fiber.Config{ErrorHandler: httpx.ErrorHandler})
	Register(app.Group("/api/v1"), db, tok)
	return &env{t: t, app: app, db: db, tok: tok}
}

func (e *env) user(role, email string) (id, token string) {
	e.t.Helper()
	err := e.db.QueryRow(context.Background(),
		`INSERT INTO users (email, full_name, role) VALUES ($1,$2,$3::user_role) RETURNING id::text`,
		email, "Test "+role, role).Scan(&id)
	if err != nil {
		e.t.Fatal(err)
	}
	token, err = e.tok.NewAccess(id, role)
	if err != nil {
		e.t.Fatal(err)
	}
	e.t.Cleanup(func() {
		_, _ = e.db.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, id)
	})
	return id, token
}

type resp struct {
	Status int
	Body   map[string]any
}

func (r resp) data() map[string]any { m, _ := r.Body["data"].(map[string]any); return m }
func (r resp) list() []any          { l, _ := r.Body["data"].([]any); return l }
func (r resp) msg() string {
	m, _ := r.Body["error"].(map[string]any)
	s, _ := m["message"].(string)
	return s
}

func (e *env) do(method, path, token string, body any) resp {
	e.t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, "/api/v1/admin"+path, rd)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := e.app.Test(req, -1)
	if err != nil {
		e.t.Fatal(err)
	}
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return resp{Status: res.StatusCode, Body: m}
}

func (e *env) want(r resp, status int, what string) resp {
	e.t.Helper()
	if r.Status != status {
		e.t.Fatalf("%s: HTTP %d (muốn %d): %v", what, r.Status, status, r.Body)
	}
	return r
}

func TestAccessControl(t *testing.T) {
	e := setup(t)
	_, parent := e.user("parent", "ac-parent@test.local")
	_, editor := e.user("editor", "ac-editor@test.local")
	_, admin := e.user("admin", "ac-admin@test.local")

	e.want(e.do("GET", "/users", "", nil), 401, "không token")
	e.want(e.do("GET", "/users", parent, nil), 403, "phụ huynh vào /users")
	e.want(e.do("GET", "/subjects", parent, nil), 403, "phụ huynh vào /subjects")
	e.want(e.do("GET", "/users", editor, nil), 403, "editor vào /users")
	e.want(e.do("GET", "/stats", editor, nil), 403, "editor vào /stats")
	e.want(e.do("GET", "/subjects", editor, nil), 200, "editor vào /subjects")
	e.want(e.do("GET", "/users", admin, nil), 200, "admin vào /users")
	e.want(e.do("GET", "/stats", admin, nil), 200, "admin vào /stats")
	e.want(e.do("GET", "/audit", admin, nil), 200, "admin vào /audit")
	e.want(e.do("GET", "/profiles", admin, nil), 200, "admin vào /profiles")
}

func TestUserManagement(t *testing.T) {
	e := setup(t)
	adminID, admin := e.user("admin", "um-admin@test.local")
	parentID, parent := e.user("parent", "um-parent@test.local")

	// danh sách + lọc
	r := e.want(e.do("GET", "/users?q=um-parent&role=parent&status=active", admin, nil), 200, "lọc")
	if len(r.list()) != 1 {
		t.Fatalf("lọc trả %d dòng, muốn 1", len(r.list()))
	}
	e.want(e.do("GET", "/users?role=hacker", admin, nil), 400, "role sai")
	e.want(e.do("GET", "/users?q=%25_%5C", admin, nil), 200, "ký tự đặc biệt trong tìm kiếm")
	e.want(e.do("GET", "/users/not-uuid", admin, nil), 404, "id sai")

	// chi tiết
	d := e.want(e.do("GET", "/users/"+parentID, admin, nil), 200, "chi tiết").data()
	if d["user"].(map[string]any)["email"] != "um-parent@test.local" {
		t.Fatalf("chi tiết sai: %v", d)
	}

	// không tự hạ quyền / tự khoá; không xoá chính mình
	e.want(e.do("PATCH", "/users/"+adminID, admin, map[string]any{"role": "parent"}), 400, "tự hạ quyền")
	e.want(e.do("PATCH", "/users/"+adminID, admin, map[string]any{"disabled": true}), 400, "tự khoá")
	e.want(e.do("DELETE", "/users/"+adminID, admin, nil), 400, "tự xoá")

	// đổi vai trò → editor có hiệu lực ngay (token cũ vẫn mang role parent)
	e.want(e.do("PATCH", "/users/"+parentID, admin, map[string]any{"role": "editor", "full_name": "Tên Mới"}), 200, "nâng quyền")
	e.want(e.do("GET", "/subjects", parent, nil), 200, "quyền mới có hiệu lực ngay")
	e.want(e.do("PATCH", "/users/"+parentID, admin, map[string]any{"role": "superuser"}), 400, "role sai")
	e.want(e.do("PATCH", "/users/"+parentID, admin, map[string]any{"full_name": "  "}), 400, "tên rỗng")

	// khoá → bị chặn ngay dù token còn hạn; mở khoá → vào lại được
	e.want(e.do("PATCH", "/users/"+parentID, admin, map[string]any{"disabled": true}), 200, "khoá")
	e.want(e.do("GET", "/subjects", parent, nil), 401, "tài khoản khoá bị chặn")
	e.want(e.do("PATCH", "/users/"+parentID, admin, map[string]any{"disabled": false}), 200, "mở khoá")
	e.want(e.do("GET", "/subjects", parent, nil), 200, "mở khoá xong vào lại được")

	e.want(e.do("POST", "/users/"+parentID+"/revoke-sessions", admin, nil), 200, "thu hồi phiên")

	// xoá vĩnh viễn (kèm hồ sơ con)
	if _, err := e.db.Exec(context.Background(),
		`INSERT INTO profiles (parent_id, display_name, grade) VALUES ($1,'Bé Na',1)`, parentID); err != nil {
		t.Fatal(err)
	}
	pr := e.want(e.do("GET", "/profiles?q=Na&grade=1", admin, nil), 200, "danh sách hồ sơ")
	if len(pr.list()) < 1 {
		t.Fatal("không thấy hồ sơ vừa tạo")
	}
	e.want(e.do("DELETE", "/users/"+parentID, admin, nil), 200, "xoá")
	e.want(e.do("GET", "/users/"+parentID, admin, nil), 404, "đã xoá")
	var n int
	_ = e.db.QueryRow(context.Background(), `SELECT count(*) FROM profiles WHERE parent_id=$1`, parentID).Scan(&n)
	if n != 0 {
		t.Fatalf("hồ sơ con chưa bị xoá theo: %d", n)
	}

	// nhật ký ghi lại thao tác
	a := e.want(e.do("GET", "/audit?action=user.", admin, nil), 200, "audit")
	if len(a.list()) < 3 {
		t.Fatalf("nhật ký thiếu: %d dòng", len(a.list()))
	}
}

func TestLastAdminProtected(t *testing.T) {
	e := setup(t)
	// bảo đảm trong DB chỉ còn 2 admin test (và không có admin thật nào khác bị ảnh hưởng)
	var others int
	_ = e.db.QueryRow(context.Background(), `SELECT count(*) FROM users WHERE role='admin'`).Scan(&others)
	if others != 0 {
		t.Skip("DB có admin sẵn; bỏ qua test 'admin cuối cùng'")
	}
	a1, t1 := e.user("admin", "la-1@test.local")
	a2, t2 := e.user("admin", "la-2@test.local")
	e.want(e.do("PATCH", "/users/"+a2, t1, map[string]any{"disabled": true}), 200, "khoá admin 2")
	// a1 là admin duy nhất còn hoạt động; a2 (đã khoá) thử hạ a1 thì bị chặn ở middleware
	e.want(e.do("PATCH", "/users/"+a1, t2, map[string]any{"role": "parent"}), 401, "admin bị khoá không thao tác được")
	// mở lại a2, hạ a2 xuống, rồi a1 không thể bị hạ bởi chính nó (đã chặn tự hạ)
	e.want(e.do("PATCH", "/users/"+a2, t1, map[string]any{"disabled": false}), 200, "mở khoá admin 2")
	e.want(e.do("PATCH", "/users/"+a1, t2, map[string]any{"role": "parent"}), 200, "a2 hạ a1 khi còn 2 admin")
	// giờ a2 là admin cuối; a1 (parent) không còn quyền
	e.want(e.do("PATCH", "/users/"+a2, t1, map[string]any{"role": "parent"}), 403, "a1 hết quyền")
}

func block(id, typ string, extra map[string]any) map[string]any {
	m := map[string]any{"id": id, "type": typ}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

func validBlocks() []any {
	return []any{
		block("b1", "mascot_say", map[string]any{"text": "Chào bạn!"}),
		block("b2", "exercise", map[string]any{
			"kind": "mcq", "points": 10, "prompt": "1 + 1 = ?",
			"options": []any{map[string]any{"id": "a", "text": "2"}, map[string]any{"id": "b", "text": "3"}},
			"answer":  map[string]any{"correct": []any{"a"}}, "explanation": "1 + 1 = 2",
		}),
		block("b3", "summary", map[string]any{"markdown": "Giỏi quá!"}),
	}
}

func TestContentWorkflow(t *testing.T) {
	e := setup(t)
	_, admin := e.user("admin", "cw-admin@test.local")
	_, editor := e.user("editor", "cw-editor@test.local")

	// môn học
	sub := e.want(e.do("POST", "/subjects", editor, map[string]any{"slug": "cw-mon", "name": "Môn thử", "color": "#112233"}), 200, "tạo môn").data()
	sid := int(sub["id"].(float64))
	t.Cleanup(func() {
		_, _ = e.db.Exec(context.Background(), `DELETE FROM courses WHERE subject_id=$1`, sid)
		_, _ = e.db.Exec(context.Background(), `DELETE FROM subjects WHERE id=$1`, sid)
	})
	e.want(e.do("POST", "/subjects", editor, map[string]any{"slug": "cw-mon", "name": "Trùng"}), 409, "slug môn trùng")
	e.want(e.do("POST", "/subjects", editor, map[string]any{"slug": "Bad Slug", "name": "x"}), 400, "slug sai")
	e.want(e.do("PATCH", "/subjects/"+itoa(sid), editor, map[string]any{"description": "Mô tả", "is_active": false}), 200, "sửa môn")

	// khoá học
	c := e.want(e.do("POST", "/courses", editor, map[string]any{"subject_id": sid, "grade": 1, "slug": "cw-khoa", "title": "Khoá thử"}), 200, "tạo khoá").data()
	cid := c["id"].(string)
	e.want(e.do("POST", "/courses", editor, map[string]any{"subject_id": sid, "grade": 1, "slug": "cw-khoa-2", "title": "Trùng lớp"}), 409, "trùng môn+lớp")
	e.want(e.do("POST", "/courses", editor, map[string]any{"subject_id": sid, "grade": 11, "slug": "cw-khoa-3", "title": "Lớp 11"}), 400, "lớp sai")
	e.want(e.do("PATCH", "/courses/"+cid, editor, map[string]any{"summary": "Tóm tắt", "status": "review"}), 200, "sửa khoá")

	// chương
	u1 := e.want(e.do("POST", "/courses/"+cid+"/units", editor, map[string]any{"slug": "chuong-1", "title": "Chương 1"}), 200, "tạo chương 1").data()["id"].(string)
	u2 := e.want(e.do("POST", "/courses/"+cid+"/units", editor, map[string]any{"slug": "chuong-2", "title": "Chương 2"}), 200, "tạo chương 2").data()["id"].(string)
	e.want(e.do("POST", "/courses/"+cid+"/units", editor, map[string]any{"slug": "chuong-1", "title": "Trùng"}), 409, "slug chương trùng")
	e.want(e.do("POST", "/courses/"+cid+"/units/reorder", editor, map[string]any{"ids": []string{u2, u1}}), 200, "đảo chương")

	// bài học
	l1 := e.want(e.do("POST", "/units/"+u1+"/lessons", editor, map[string]any{"slug": "cw-bai-1", "title": "Bài 1"}), 200, "tạo bài 1").data()["id"].(string)
	l2 := e.want(e.do("POST", "/units/"+u1+"/lessons", editor, map[string]any{"slug": "cw-bai-2", "title": "Bài 2"}), 200, "tạo bài 2").data()["id"].(string)
	e.want(e.do("POST", "/units/"+u1+"/lessons", editor, map[string]any{"slug": "cw-bai-1", "title": "Trùng"}), 409, "slug bài trùng")
	e.want(e.do("POST", "/units/"+u1+"/lessons/reorder", editor, map[string]any{"ids": []string{l2, l1}}), 200, "đảo bài")

	// khoá học chi tiết: thứ tự chương/bài theo reorder
	det := e.want(e.do("GET", "/courses/"+cid, editor, nil), 200, "chi tiết khoá").data()
	units := det["units"].([]any)
	if len(units) != 2 || units[0].(map[string]any)["id"] != u2 {
		t.Fatalf("thứ tự chương sai: %v", units)
	}
	lessons := units[1].(map[string]any)["lessons"].([]any)
	if len(lessons) != 2 || lessons[0].(map[string]any)["id"] != l2 {
		t.Fatalf("thứ tự bài sai: %v", lessons)
	}

	// bài mới tạo chưa hợp lệ → không xuất bản được (422), nhưng lưu nháp được
	g := e.want(e.do("GET", "/lessons/"+l1, editor, nil), 200, "đọc bài").data()
	ver := int(g["lesson"].(map[string]any)["version"].(float64))
	if len(g["lesson"].(map[string]any)["problems"].([]any)) == 0 {
		t.Fatal("bài khởi tạo phải có cảnh báo (thiếu bài tập)")
	}
	e.want(e.do("POST", "/lessons/"+l1+"/status", editor, map[string]any{"status": "published"}), 422, "xuất bản bài chưa hợp lệ")
	e.want(e.do("POST", "/lessons/"+l1+"/status", editor, map[string]any{"status": "bogus"}), 400, "status sai")

	// lưu nội dung hợp lệ → đồng bộ bảng exercises
	sv := e.want(e.do("PUT", "/lessons/"+l1+"/content", editor, map[string]any{"blocks": validBlocks(), "version": ver}), 200, "lưu nội dung").data()
	if sv["exercises"].(float64) != 1 || len(sv["problems"].([]any)) != 0 {
		t.Fatalf("kết quả lưu sai: %v", sv)
	}
	newVer := int(sv["version"].(float64))
	var ex int
	_ = e.db.QueryRow(context.Background(), `SELECT count(*) FROM exercises WHERE lesson_id=$1`, l1).Scan(&ex)
	if ex != 1 {
		t.Fatalf("exercises = %d, muốn 1", ex)
	}
	// phiên bản cũ → xung đột
	e.want(e.do("PUT", "/lessons/"+l1+"/content", editor, map[string]any{"blocks": validBlocks(), "version": ver}), 409, "ghi đè phiên bản cũ")
	e.want(e.do("PUT", "/lessons/"+l1+"/content", editor, map[string]any{"version": newVer}), 400, "thiếu blocks")

	// xuất bản → khớp /lessons/:slug công khai không? (kiểm tra qua DB)
	e.want(e.do("POST", "/lessons/"+l1+"/status", editor, map[string]any{"status": "published"}), 200, "xuất bản")
	var st string
	var pub *time.Time
	_ = e.db.QueryRow(context.Background(), `SELECT status::text, published_at FROM lessons WHERE id=$1`, l1).Scan(&st, &pub)
	if st != "published" || pub == nil {
		t.Fatalf("trạng thái sau xuất bản: %s %v", st, pub)
	}
	// bài đã xuất bản: lưu nội dung không hợp lệ bị chặn
	bad := []any{block("b1", "mascot_say", map[string]any{"text": "chỉ có một khối"})}
	e.want(e.do("PUT", "/lessons/"+l1+"/content", editor, map[string]any{"blocks": bad, "version": newVer}), 422, "lưu nội dung hỏng vào bài đã xuất bản")
	// block trùng id vẫn là lỗi validate
	dup := append(validBlocks(), block("b1", "text", map[string]any{"markdown": "x"}))
	e.want(e.do("PUT", "/lessons/"+l1+"/content", editor, map[string]any{"blocks": dup, "version": newVer}), 422, "id khối trùng")
	e.want(e.do("POST", "/lessons/"+l1+"/status", editor, map[string]any{"status": "draft"}), 200, "gỡ xuất bản")

	// sửa thông tin + chuyển chương
	e.want(e.do("PATCH", "/lessons/"+l1, editor, map[string]any{"title": "Bài 1 (sửa)", "est_minutes": 8, "xp_reward": 30, "unit_id": u2}), 200, "sửa bài/chuyển chương")
	e.want(e.do("PATCH", "/lessons/"+l1, editor, map[string]any{"est_minutes": 99}), 400, "thời lượng sai")
	e.want(e.do("PATCH", "/lessons/"+l1, editor, map[string]any{"slug": "cw-bai-2"}), 409, "slug trùng bài khác")

	// nhân bản
	cp := e.want(e.do("POST", "/lessons/"+l1+"/duplicate", editor, nil), 200, "nhân bản").data()["id"].(string)
	var cpSlug, cpStatus string
	var cpEx int
	_ = e.db.QueryRow(context.Background(), `SELECT slug, status::text, (SELECT count(*) FROM exercises WHERE lesson_id=lessons.id) FROM lessons WHERE id=$1`, cp).Scan(&cpSlug, &cpStatus, &cpEx)
	if cpSlug != "cw-bai-1-copy" || cpStatus != "draft" || cpEx != 1 {
		t.Fatalf("bản sao sai: %s %s %d", cpSlug, cpStatus, cpEx)
	}

	// phân quyền xoá: editor không được xoá, admin được
	e.want(e.do("DELETE", "/lessons/"+cp, editor, nil), 403, "editor xoá bài")
	e.want(e.do("DELETE", "/lessons/"+cp, admin, nil), 200, "admin xoá bài")
	e.want(e.do("DELETE", "/units/"+u2, editor, nil), 403, "editor xoá chương")
	e.want(e.do("DELETE", "/subjects/"+itoa(sid), admin, nil), 409, "xoá môn còn khoá học")
	e.want(e.do("DELETE", "/courses/"+cid, editor, nil), 403, "editor xoá khoá")
	e.want(e.do("DELETE", "/units/"+u2, admin, nil), 200, "admin xoá chương (kèm bài)")
	e.want(e.do("DELETE", "/courses/"+cid, admin, nil), 200, "admin xoá khoá")
	e.want(e.do("DELETE", "/subjects/"+itoa(sid), admin, nil), 200, "admin xoá môn")

	// danh sách khoá học / thống kê vẫn chạy
	e.want(e.do("GET", "/courses", editor, nil), 200, "danh sách khoá")
	st2 := e.want(e.do("GET", "/stats", admin, nil), 200, "stats").data()
	for _, k := range []string{"users", "content", "learning", "series", "top_lessons", "hardest_lessons"} {
		if _, ok := st2[k]; !ok {
			t.Errorf("stats thiếu %q", k)
		}
	}
	if n := len(st2["series"].([]any)); n != 14 {
		t.Errorf("series có %d điểm, muốn 14", n)
	}
	au := e.want(e.do("GET", "/audit?action=lesson.", admin, nil), 200, "audit bài")
	if total, _ := au.Body["meta"].(map[string]any)["total"].(float64); total == 0 {
		t.Error("nhật ký không ghi thao tác bài học")
	}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }
