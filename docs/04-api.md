# 04. Thiết kế API (Go Fiber)

Base URL: `/api/v1` · JSON · UTF-8 · Thời gian ISO-8601 (UTC).

## 1. Quy ước

**Thành công**
```json
{ "data": { ... }, "meta": { "page": 1, "page_size": 20, "total": 134 } }
```
**Lỗi**
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Email không hợp lệ", "details": [{"field":"email","msg":"invalid"}] } }
```
Mã lỗi: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `CONFLICT`, `RATE_LIMITED`, `LESSON_LOCKED`, `TIME_LIMIT_REACHED`, `INTERNAL`.

**Xác thực**: header `Authorization: Bearer <access>`; refresh qua cookie HttpOnly `refresh_token`. Token hồ sơ con có claim `pid`.

**Phân quyền (RBAC)**: `parent`, `teacher`, `editor`, `admin`; middleware `RequireRole(...)`, `RequireProfile()`.

## 2. Endpoints

### Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký phụ huynh (email, password, full_name, consent=true) |
| POST | `/auth/login` | Trả access token + set refresh cookie |
| POST | `/auth/refresh` | Xoay refresh token |
| POST | `/auth/logout` | Thu hồi refresh token |
| POST | `/auth/forgot-password` · `/auth/reset-password` | Quên/đặt lại mật khẩu |
| POST | `/auth/verify-email` | Xác minh email |

### Tài khoản & hồ sơ con
| Method | Path | Mô tả |
|---|---|---|
| GET | `/me` | Thông tin phụ huynh |
| PUT | `/me/pin` | Đặt/đổi PIN phụ huynh |
| POST | `/me/pin/verify` | Xác minh PIN (trả token ngắn hạn `parent_unlock`) |
| GET/POST | `/profiles` | Danh sách / tạo hồ sơ con (tối đa 5) |
| PATCH/DELETE | `/profiles/:id` | Sửa (tên, avatar, lớp, giới hạn thời gian) / xoá |
| POST | `/profiles/:id/select` | Chọn hồ sơ → trả profile token |

### Danh mục & bài học (công khai đọc được; có progress nếu có profile)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/subjects` | Danh sách môn |
| GET | `/courses?subject=toan&grade=2` | Khóa học |
| GET | `/courses/:slug` | Chi tiết + units + lessons + tiến độ của profile |
| GET | `/lessons/:slug` | Nội dung bài (đã lọc đáp án), trạng thái khóa |
| GET | `/search?q=` | Tìm bài học |
| GET | `/home` | Dữ liệu trang chủ: "Tiếp tục học", gợi ý, nhiệm vụ ngày |

### Làm bài & tiến độ
| Method | Path | Mô tả |
|---|---|---|
| POST | `/lessons/:id/start` | Bắt đầu / tiếp tục |
| POST | `/exercises/:id/answer` | Nộp đáp án 1 bài tập → `{correct, explanation, xp, hint?}` |
| POST | `/lessons/:id/progress` | Lưu vị trí block hiện tại + thời gian |
| POST | `/lessons/:id/complete` | Kết thúc → `{score, stars, xp_gained, streak, new_badges[], next_lesson}` |
| GET | `/profiles/:id/progress` | Tổng quan tiến độ theo môn |
| GET | `/profiles/:id/badges` | Huy hiệu |
| GET | `/profiles/:id/streak` | Streak + lịch hoạt động |
| GET | `/quests/daily` | Nhiệm vụ hằng ngày |
| GET | `/review/due` | Bài ôn tập đến hạn (GĐ2) |

### Phụ huynh (yêu cầu `parent_unlock`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/parent/dashboard` | Tổng quan các con |
| GET | `/parent/profiles/:id/report?from=&to=` | Báo cáo chi tiết: thời gian, điểm yếu theo `skill_tag` |
| PUT | `/parent/profiles/:id/limits` | Giới hạn thời gian/ngày |

### CMS (editor/admin)
| Method | Path | Mô tả |
|---|---|---|
| CRUD | `/cms/subjects`, `/cms/courses`, `/cms/units`, `/cms/lessons` | Quản lý cấu trúc |
| PUT | `/cms/lessons/:id/content` | Lưu nội dung block (validate JSON schema) |
| POST | `/cms/lessons/:id/publish` · `/unpublish` | Xuất bản → đồng bộ `exercises`, revalidate Next.js |
| GET | `/cms/lessons/:id/preview` | Xem trước |
| POST | `/cms/media` | Upload ảnh/audio (presigned URL) |

### Admin (đã triển khai: `apps/api/internal/admin`)
Mọi route `/admin/*` kiểm tra lại vai trò **trong CSDL** ở mỗi request (đổi quyền / khoá tài khoản có hiệu lực ngay, không chờ access token hết hạn). `editor` chỉ dùng nhóm nội dung; còn lại chỉ `admin`.

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Thống kê | `GET /admin/stats` | admin |
| Người dùng | `GET /admin/users?q=&role=&status=&page=` · `GET/PATCH/DELETE /admin/users/:id` · `POST /admin/users/:id/revoke-sessions` | admin |
| Học sinh | `GET /admin/profiles?q=&grade=` (chỉ đọc) | admin |
| Nhật ký | `GET /admin/audit?action=user.` | admin |
| Môn học | `GET/POST /admin/subjects` · `PATCH /admin/subjects/:id` · `DELETE` (admin) | editor+ |
| Khoá học | `GET/POST /admin/courses` · `GET/PATCH /admin/courses/:id` · `DELETE` (admin) | editor+ |
| Chương | `POST /admin/courses/:id/units` · `POST …/units/reorder` · `PATCH /admin/units/:id` · `DELETE` (admin) | editor+ |
| Bài học | `POST /admin/units/:id/lessons` · `POST …/lessons/reorder` · `GET/PATCH /admin/lessons/:id` · `PUT …/content` · `POST …/status` · `POST …/duplicate` · `DELETE` (admin) | editor+ |

Quy tắc: không tự hạ quyền/khoá/xoá chính mình; luôn còn ≥ 1 admin hoạt động; xoá người dùng là xoá vĩnh viễn (cả hồ sơ con, tiến độ). Lưu nội dung (`PUT …/content`) nhận `version` để chống ghi đè, luôn lưu được bản nháp (trả về `problems`), nhưng bài `published` và thao tác xuất bản phải qua `content.Lesson.Validate()` (cùng bộ kiểm tra với `make content-validate`). Mọi thao tác ghi đều vào `audit_logs`.

**Tạo admin đầu tiên:** đặt `ADMIN_EMAILS=email1@..,email2@..` trong `.env`; người dùng có email đó được nâng thành `admin` khi đăng nhập Google. Sau đó quản lý vai trò ngay trong `/admin/nguoi-dung`.

## 3. Ví dụ

**POST `/exercises/:id/answer`**
```json
// request
{ "response": { "choice_id": "b" }, "time_ms": 4200 }
// response
{ "data": { "correct": true, "xp": 10, "explanation": "7 + 5 = 12 vì 7 + 3 = 10, thêm 2.", "streak_in_lesson": 3 } }
```
Với bài code Python: `{ "response": { "code": "...", "passed": [true,true,false] } }` – server kiểm tra lại cơ bản (độ dài, test id hợp lệ); chấm lại chính thức bằng runner nếu bật chế độ xác minh.

**GET `/lessons/:slug`** (rút gọn)
```json
{ "data": {
  "id": "…", "title": "Cộng có nhớ", "est_minutes": 8, "xp_reward": 30,
  "locked": false,
  "blocks": [
    {"id":"b1","type":"intro","mascot":"fox","text":"Chào bạn! Hôm nay mình học cộng có nhớ nhé!"},
    {"id":"b2","type":"interactive","kind":"counters","config":{"a":7,"b":5}},
    {"id":"b3","type":"exercise","exercise_id":"…","kind":"mcq","prompt":"7 + 5 = ?","options":[{"id":"a","text":"11"},{"id":"b","text":"12"}]}
  ] } }
```

## 4. Khung code Fiber

```go
// cmd/api/main.go
func main() {
    cfg := config.Load()
    pool := platform.NewPG(cfg.DatabaseURL)
    rdb  := platform.NewRedis(cfg.RedisURL)
    app  := server.New(cfg, pool, rdb)
    log.Fatal(app.Listen(":" + cfg.HTTPPort))
}

// internal/server/server.go
func New(cfg config.Config, db *pgxpool.Pool, rdb *redis.Client) *fiber.App {
    app := fiber.New(fiber.Config{
        ErrorHandler: httpx.ErrorHandler,
        BodyLimit:    2 * 1024 * 1024,
        JSONEncoder:  sonic.Marshal,
    })
    app.Use(recover.New(), requestid.New(), middleware.Logger(),
        cors.New(cors.Config{AllowOrigins: cfg.CORSOrigins, AllowCredentials: true}),
        helmet.New(), compress.New())
    app.Use(limiter.New(limiter.Config{Max: 120, Expiration: time.Minute}))

    api := app.Group("/api/v1")
    auth.Register(api.Group("/auth"), deps)
    api.Use(middleware.OptionalAuth(cfg.JWTSecret))
    catalog.Register(api, deps)
    // nhóm cần đăng nhập
    priv := api.Group("", middleware.RequireAuth())
    account.Register(priv, deps); exercise.Register(priv, deps); progress.Register(priv, deps)
    cms.Register(api.Group("/cms", middleware.RequireRole("editor","admin")), deps)
    return app
}
```

Thư viện: `gofiber/fiber/v2`, `jackc/pgx/v5`, `sqlc`, `golang-jwt/jwt/v5`, `alexedwards/argon2id`, `go-playground/validator/v10`, `redis/go-redis/v9`, `rs/zerolog`, `aws-sdk-go-v2` (S3), `swaggo` hoặc `oapi-codegen`.

## 5. Quy tắc nghiệp vụ quan trọng
- **Khoá bài**: bài mở khi tất cả `lesson_prerequisites` đạt ≥1⭐ (hoặc bài đầu chương).
- **Giới hạn thời gian**: middleware kiểm tra `daily_activity.minutes_spent` vs `daily_limit_minutes` → `TIME_LIMIT_REACHED`.
- **Chống gian lận**: đáp án không bao giờ gửi xuống client; mỗi exercise tính XP một lần/lần học (idempotent theo `profile+exercise+lesson_session`).
- **Idempotency**: `complete` có thể gọi lại an toàn.
- **Rate limit** chặt hơn cho `/auth/*` (5/phút/IP).
