# HocDe.vn – Website học tập vui nhộn cho học sinh Tiểu học & THCS

Nền tảng học trực tuyến các môn **Toán, Tiếng Việt, Tiếng Anh, Lập trình Python**… với bài học trực quan, tương tác, giao diện sáng sủa kiểu trẻ em.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router, TypeScript), Tailwind CSS, Framer Motion |
| Backend | Go 1.23 + Fiber v2, pgx, sqlc, golang-migrate |
| Database | PostgreSQL 16 (JSONB cho nội dung bài học) |
| Cache/Queue | Redis (session, rate-limit, leaderboard) |
| Lưu file | S3-compatible (MinIO local / Cloudflare R2 prod) |
| Chạy Python | Pyodide (WebAssembly, chạy ngay trên trình duyệt) |

## Mục lục tài liệu

1. [Tổng quan sản phẩm](docs/01-tong-quan.md) – mục tiêu, người dùng, chương trình học, phạm vi MVP
2. [Kiến trúc hệ thống](docs/02-kien-truc.md) – sơ đồ, cấu trúc thư mục, quyết định kỹ thuật
3. [Thiết kế cơ sở dữ liệu](docs/03-co-so-du-lieu.md) – ERD, SQL schema
4. [Thiết kế API](docs/04-api.md) – REST endpoints Go Fiber
5. [Thiết kế Frontend](docs/05-frontend.md) – Next.js routes, component, state
6. [UI/UX kiểu trẻ em](docs/06-ui-ux.md) – màu sắc, font, linh vật, animation
7. [Bài học tương tác](docs/07-bai-hoc-tuong-tac.md) – block nội dung, dạng bài tập, Python runner
8. [Gamification](docs/08-gamification.md) – sao, XP, streak, huy hiệu
9. [Bảo mật & an toàn trẻ em](docs/09-bao-mat-an-toan.md)
10. [Triển khai & lộ trình](docs/10-trien-khai-lo-trinh.md) – DevOps, roadmap, testing
11. [Đăng nhập Google](docs/11-dang-nhap-google.md) – luồng OAuth, phiên, cấu hình Google Cloud

## Bắt đầu nhanh (khi đã code)

```bash
docker compose up -d db redis minio
cd apps/api && go run ./cmd/api        # :8080
cd apps/web && pnpm dev                # :3000
```
