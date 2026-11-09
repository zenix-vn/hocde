# 02. Kiến trúc hệ thống

## 1. Sơ đồ tổng thể

```
                    ┌──────────────────────────┐
   Trình duyệt ───► │  CDN / Reverse proxy     │  (Caddy / Nginx / Cloudflare)
   (Next.js UI)     └───────┬──────────┬───────┘
        ▲                   │          │
        │ SSR/ISR           ▼          ▼
        │            ┌───────────┐  ┌────────────────┐
        └────────────│ Next.js   │  │ Go Fiber API   │
                     │ (web)     │─►│ /api/v1/*      │
                     └───────────┘  └──┬──────┬──────┘
                                       │      │
                          ┌────────────▼┐  ┌──▼────────┐   ┌──────────────┐
                          │ PostgreSQL  │  │  Redis    │   │ S3 / MinIO   │
                          │ (dữ liệu)   │  │ (cache)   │   │ (ảnh, audio) │
                          └─────────────┘  └───────────┘   └──────────────┘
```

- **Monolith module hoá** (modular monolith) cho Go API – đủ đơn giản cho đội nhỏ, dễ tách service sau.
- Next.js gọi API qua 2 đường: (a) **Server Components** gọi nội bộ (`http://api:8080`) để lấy nội dung công khai; (b) **Client** gọi qua `/api/v1` (proxy rewrite) kèm cookie.
- Chạy Python **hoàn toàn ở client** (Pyodide trong Web Worker) → không cần sandbox server, không rủi ro bảo mật, không tốn tài nguyên.

## 2. Quyết định kỹ thuật (ADR rút gọn)

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Modular monolith | Đội nhỏ, triển khai đơn giản |
| 2 | `pgx` + `sqlc` thay vì ORM | Type-safe, nhanh, SQL rõ ràng |
| 3 | Nội dung bài học lưu **JSONB** (danh sách block) | Linh hoạt thêm dạng block mới, không đổi schema |
| 4 | Auth: JWT access (15 phút) + refresh token (HttpOnly cookie, lưu hash ở DB) | An toàn, thu hồi được |
| 5 | Hồ sơ con tách khỏi tài khoản phụ huynh | Trẻ không cần email/mật khẩu; tuân thủ bảo vệ dữ liệu trẻ em |
| 6 | Pyodide trong Web Worker | An toàn, chạy offline, không có server sandbox |
| 7 | Tailwind + bộ component riêng (kiểu "kẹo ngọt") | Tuỳ biến tốt giao diện trẻ em |
| 8 | TanStack Query cho server state, Zustand cho UI state | Đơn giản, ít boilerplate |
| 9 | Chấm bài **ở server** (không tin client) cho bài có điểm | Chống gian lận; code Python chấm bằng test case chạy ở client + xác minh nhẹ ở server |
| 10 | OpenAPI spec → sinh TypeScript client | Đồng bộ FE/BE |

## 3. Cấu trúc monorepo

```
hocde.vn/
├── apps/
│   ├── api/                        # Go Fiber
│   │   ├── cmd/api/main.go         # entrypoint
│   │   ├── cmd/seed/main.go        # nạp dữ liệu mẫu
│   │   ├── internal/
│   │   │   ├── config/             # env, load config
│   │   │   ├── server/             # fiber app, routes, middleware
│   │   │   ├── middleware/         # auth, rbac, ratelimit, logger, recover
│   │   │   ├── auth/               # handler, service, repo (đăng ký, login, refresh)
│   │   │   ├── account/            # phụ huynh, hồ sơ con
│   │   │   ├── catalog/            # môn, lớp, chương, bài
│   │   │   ├── lesson/             # nội dung bài, block
│   │   │   ├── exercise/           # chấm bài, attempt
│   │   │   ├── progress/           # tiến độ, sao, XP, streak
│   │   │   ├── reward/             # huy hiệu, nhiệm vụ
│   │   │   ├── report/             # báo cáo phụ huynh
│   │   │   ├── cms/                # API biên tập viên
│   │   │   ├── storage/            # S3 client, upload
│   │   │   └── platform/           # db (pgx pool), redis, logger, validator
│   │   ├── db/
│   │   │   ├── migrations/         # *.sql (golang-migrate)
│   │   │   ├── queries/            # *.sql (sqlc)
│   │   │   └── sqlc.yaml
│   │   ├── api/openapi.yaml
│   │   ├── Dockerfile
│   │   └── go.mod
│   └── web/                        # Next.js
│       ├── src/
│       │   ├── app/                # App Router (xem 05-frontend.md)
│       │   ├── components/         # ui/, lesson/, exercise/, layout/
│       │   ├── features/           # auth, catalog, lesson, progress, parent, cms
│       │   ├── lib/                # api client, utils, sound, pyodide
│       │   ├── stores/             # zustand
│       │   └── styles/
│       ├── public/                 # mascot, sounds, fonts
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── Dockerfile
├── content/                        # nội dung bài học dạng YAML/JSON (git-managed) + script import
├── docs/
├── deploy/                         # compose, nginx/caddy, k8s (sau)
├── docker-compose.yml
└── Makefile
```

### Mỗi module Go theo mẫu
```
internal/lesson/
├── handler.go     # Fiber handlers: parse, validate, trả JSON
├── service.go     # nghiệp vụ
├── repository.go  # gọi sqlc Queries
├── dto.go         # request/response struct
└── routes.go      # Register(router fiber.Router, deps)
```

## 4. Luồng chính

**Học một bài**
1. Học sinh chọn hồ sơ → `GET /lessons/:slug` (SSR trang, content JSON).
2. Client hiển thị từng block theo thứ tự (text, ảnh, video, mô phỏng, bài tập).
3. Với mỗi bài tập: `POST /lessons/:id/answers` → server chấm → trả đúng/sai + giải thích + XP.
4. Kết thúc bài: `POST /lessons/:id/complete` → tính sao, cập nhật tiến độ, streak, huy hiệu → trả màn hình chúc mừng.

**Xác thực**
- Phụ huynh login → access token (memory) + refresh cookie.
- Chọn hồ sơ con → API cấp `profile token` (claim `pid`) hạn dài hơn cho thiết bị đó; hành động nhạy cảm (đổi cài đặt, xem báo cáo) yêu cầu PIN phụ huynh.

## 5. Cấu hình môi trường (`.env`)
```
# API
APP_ENV=development
HTTP_PORT=8080
DATABASE_URL=postgres://hocde:hocde@localhost:5432/hocde?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
JWT_ACCESS_TTL=15m
REFRESH_TTL=720h
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=hocde
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio12345
CORS_ORIGINS=http://localhost:3000

# Web
NEXT_PUBLIC_API_URL=/api/v1
API_INTERNAL_URL=http://localhost:8080
```

## 6. Caching
- Catalog & nội dung bài đã xuất bản: cache Redis 5–10 phút + `ETag`; Next.js ISR (`revalidate: 300`) + `revalidateTag` khi CMS publish.
- Leaderboard: Redis sorted set.
- Rate limit: Fiber `limiter` + Redis storage.

## 7. Observability
- Log JSON (`zerolog`/`slog`), request-id middleware.
- Metrics Prometheus (`/metrics`), health `/healthz`, `/readyz`.
- Lỗi FE: Sentry. Phân tích: PostHog/Plausible (ẩn danh, không theo dõi trẻ em quá mức).
