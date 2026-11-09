# 10. Triển khai, kiểm thử & lộ trình

## 1. Môi trường
| Env | Mục đích | Hạ tầng |
|---|---|---|
| local | Phát triển | Docker Compose (db, redis, minio) + chạy api/web bằng tay |
| staging | Kiểm thử/duyệt nội dung | 1 VPS hoặc PaaS, DB riêng |
| production | Chạy thật | VPS/Cloud (xem dưới) |

## 2. Docker Compose (local)
```yaml
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: hocde, POSTGRES_PASSWORD: hocde, POSTGRES_DB: hocde }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }
    ports: ["9000:9000","9001:9001"]
    volumes: [miniodata:/data]
volumes: { pgdata: {}, miniodata: {} }
```

## 3. Dockerfile (rút gọn)
```dockerfile
# apps/api/Dockerfile
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static
COPY --from=build /out/api /api
COPY db/migrations /migrations
EXPOSE 8080
ENTRYPOINT ["/api"]
```
```dockerfile
# apps/web/Dockerfile  (Next.js standalone)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile
FROM deps AS build
COPY . .
RUN pnpm build            # next.config: output: 'standalone'
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node","server.js"]
```

## 4. Production
- **Giai đoạn đầu**: 1–2 VPS (VN: Viettel/FPT/VNG; hoặc Hetzner/DigitalOcean) chạy Docker Compose + Caddy (HTTPS tự động); Postgres managed hoặc container có backup; Cloudflare làm CDN/WAF; R2 lưu media.
- **Mở rộng**: Kubernetes/Fly.io/Cloud Run, Postgres managed (đọc replica), Redis managed, nhiều replica API (stateless).
- Domain: `hocde.vn` (web), `api.hocde.vn` hoặc cùng domain qua `/api` (khuyến nghị cùng domain để dùng cookie đơn giản).

## 5. CI/CD (GitHub Actions)
1. **PR**: `go vet` + `golangci-lint` + `go test ./...` (Postgres service) · `pnpm lint` + `tsc` + `vitest` · Playwright smoke.
2. **Merge main**: build & push image → deploy staging tự động.
3. **Tag `v*`**: deploy production (duyệt tay), chạy migration trước khi chuyển traffic (`migrate up`), health check, rollback bằng tag trước.

## 6. Chiến lược test
| Lớp | Công cụ | Nội dung |
|---|---|---|
| Unit BE | `testing`, `testify` | chấm điểm, tính sao/streak, rule huy hiệu |
| Integration BE | `testcontainers-go` | repo + API với Postgres thật |
| Contract | OpenAPI lint + sinh client | tránh lệch FE/BE |
| Unit FE | Vitest + RTL | block, exercise component |
| E2E | Playwright | luồng đăng ký → học → báo cáo; mobile viewport |
| Nội dung | script validate JSON Schema + kiểm tra link/ảnh/audio | chạy trong CI |
| Tải | k6 | 500 CCU học bài, nộp đáp án |
| A11y | axe, Lighthouse CI | điểm ≥ 90 |

## 7. Lộ trình (ước lượng đội 3–4 người: 1–2 BE/FE full-stack, 1 UI/UX, 1 nội dung)

| Giai đoạn | Thời gian | Kết quả |
|---|---|---|
| **0. Chuẩn bị** | 1 tuần | Repo monorepo, CI, Docker, design system sơ bộ, chốt linh vật |
| **1. Nền tảng** | 3 tuần | Auth, hồ sơ con, catalog, migration, UI kit "kẹo", layout |
| **2. Bài học lõi** | 4 tuần | LessonPlayer, 6 dạng bài tập đầu, chấm điểm, tiến độ, sao/XP/streak, ResultScreen |
| **3. Tương tác & Python** | 3 tuần | Mô phỏng Toán (counters, number line), Pyodide runner + turtle, audio TTS |
| **4. CMS & nội dung** | 3 tuần | Trình soạn block, publish, import YAML; soạn 30–40 bài mẫu (Toán 1–2, Python cơ bản) |
| **5. Phụ huynh & an toàn** | 2 tuần | Dashboard/báo cáo, PIN, giới hạn thời gian, xoá dữ liệu, trang pháp lý |
| **6. Hoàn thiện & beta** | 3 tuần | Tối ưu hiệu năng, a11y, test thiết bị thật, beta 50–100 gia đình |
| **MVP ra mắt** | ~19 tuần | Toán 1–2, Python cơ bản + khung Tiếng Việt/Tiếng Anh |
| GĐ2 | +8–12 tuần | Huy hiệu/nhiệm vụ đầy đủ, ôn tập thông minh, lớp học giáo viên, PWA, thêm môn/lớp |
| GĐ3 | tiếp theo | Cá nhân hoá, Premium & thanh toán, app mobile, AI trợ giảng |

## 8. Rủi ro & giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Nội dung tốn công nhất | Bắt đầu 2 môn; công cụ CMS/YAML + mẫu bài; thuê giáo viên cộng tác |
| Minh hoạ/hoạt hình tốn kém | Bộ asset có bản quyền thương mại, linh vật SVG/Lottie tái sử dụng |
| Pyodide nặng | Tải lazy + cache SW; chỉ ở bài Python |
| Trẻ mất tập trung/nghiện | Giới hạn thời gian, nhắc nghỉ, thiết kế không gây áp lực |
| Tuân thủ dữ liệu trẻ em | Thiết kế tối thiểu dữ liệu, tư vấn pháp lý sớm |

## 9. Việc làm ngay (Sprint 1)
1. Khởi tạo monorepo (`pnpm` workspace + `go mod`), `docker-compose.yml`, `Makefile`.
2. Migration `000001_init` theo [03-co-so-du-lieu.md](03-co-so-du-lieu.md), cấu hình `sqlc`.
3. API: `/healthz`, auth đăng ký/đăng nhập, CRUD hồ sơ con.
4. Web: Tailwind tokens, UI kit (Button, Card, ProgressBar), trang chủ marketing + chọn hồ sơ.
5. Seed 1 bài Toán mẫu (JSON) và render bằng `BlockRenderer`.

## 10. Makefile gợi ý
```makefile
up:        ; docker compose up -d db redis minio
migrate:   ; migrate -path apps/api/db/migrations -database "$$DATABASE_URL" up
sqlc:      ; cd apps/api && sqlc generate
api:       ; cd apps/api && go run ./cmd/api
web:       ; cd apps/web && pnpm dev
seed:      ; cd apps/api && go run ./cmd/seed
content-import: ; cd apps/api && go run ./cmd/seed content ../../content
test:      ; cd apps/api && go test ./... && cd ../web && pnpm test
```
