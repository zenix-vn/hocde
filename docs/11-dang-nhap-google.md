# 11. Đăng nhập & đăng ký bằng Google

## 1. Luồng hoạt động

```
Trình duyệt ──GET /api/v1/auth/google/start?mode=signup&consent=1──► API
   ◄── 302 accounts.google.com (state + nonce + PKCE S256), cookie hd_oauth (JWT ký, 10 phút) ──
Google ──► GET /api/v1/auth/google/callback?code&state ──► API
   API: kiểm tra state, đổi code (PKCE), xác minh ID token (chữ ký, aud, nonce),
        yêu cầu email_verified, tìm/tạo user, tạo phiên
   ◄── 302 /hoc + cookie hd_access (15 phút), hd_refresh (30 ngày, xoay vòng) ──
```

- **Đăng ký** (`mode=signup`): bắt buộc `consent=1` (ô đồng ý Điều khoản & Chính sách bảo mật). Lưu `consent_at` và `consent_version`.
- **Đăng nhập** (`mode=login`): nếu email chưa có tài khoản → chuyển về `/dang-ky?error=no_account` (không tự tạo khi chưa có đồng ý).
- Tài khoản cùng email nhưng chưa liên kết Google sẽ được liên kết (Google đã xác minh email).

## 2. Phiên & cookie
| Cookie | Nội dung | Path | Thời hạn |
|---|---|---|---|
| `hd_access` | JWT HS256 (aud `access`) | `/` | 15 phút |
| `hd_refresh` | token ngẫu nhiên 256-bit, DB chỉ lưu SHA-256 | `/api/v1/auth` | 30 ngày |
| `hd_oauth` | state OAuth ký JWT (aud `oauth-state`) | `/api/v1/auth/google` | 10 phút |

Tất cả `HttpOnly; Secure; SameSite=Lax`. Refresh token **xoay vòng** mỗi lần dùng; dùng lại token đã thu hồi (ngoài 10 giây ân hạn cho nhiều tab) thì thu hồi mọi phiên của user.

Trang cần đăng nhập (Server Component) gọi `requireUser()` ([apps/web/src/lib/auth.ts](../apps/web/src/lib/auth.ts)): nếu access hết hạn thì chuyển qua `GET /api/v1/auth/session/renew?next=...` rồi quay lại (`?renewed=1` chặn vòng lặp).

## 3. Endpoints
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/auth/google/start?mode=login\|signup&consent=1&next=/hoc` | Chuyển sang Google |
| GET | `/api/v1/auth/google/callback` | Google gọi lại |
| POST | `/api/v1/auth/refresh` | Đổi refresh token, trả user |
| GET | `/api/v1/auth/session/renew?next=` | Như refresh nhưng chuyển hướng (cho SSR) |
| POST | `/api/v1/auth/logout` | Thu hồi refresh token, xoá cookie |
| GET | `/api/v1/me` | Người dùng hiện tại (cần đăng nhập) |

Bảo vệ: `OriginCheck` (từ chối POST có `Origin` lạ), rate limit 30 req/phút cho `/auth`, `next` chỉ nhận đường dẫn nội bộ (chống open redirect).

## 4. Cấu hình Google (làm một lần)

1. Vào <https://console.cloud.google.com> → tạo (hoặc chọn) một project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**; App name: `hocde.vn`; Support email: email của bạn.
   - Authorized domains: `hocde.vn`; thêm link Chính sách bảo mật `https://hocde.vn/chinh-sach-bao-mat` và Điều khoản `https://hocde.vn/dieu-khoan`.
   - Scopes: `openid`, `email`, `profile` (không nhạy cảm, không cần Google duyệt).
   - Bấm **Publish app** (chuyển từ *Testing* sang *In production*) để ai cũng đăng nhập được.
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized JavaScript origins: `https://hocde.vn` (và `http://localhost:3000` để dev)
   - Authorized redirect URIs:
     - `https://hocde.vn/api/v1/auth/google/callback`
     - `http://localhost:3000/api/v1/auth/google/callback` (dev)
4. Lấy **Client ID** và **Client secret**.

### Đặt vào server
```bash
ssh zenix-server
cd /opt/hocde
printf 'GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=xxxx\n' >> .env
docker compose -p hocde -f deploy/docker-compose.prod.yml --env-file .env up -d api
```

### Chạy local
Điền `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` vào `.env`, chạy `make up migrate api web`, mở <http://localhost:3000/dang-ky>.

## 5. Kiểm thử đã có
- `go test ./internal/auth/`: JWT (đúng audience, sai secret, hết hạn), `start` (chưa cấu hình, thiếu consent, URL Google có PKCE/state/nonce, cookie an toàn), `callback` (thiếu/giả mạo state, huỷ), `/me` cần đăng nhập, `safeNext`.
- Smoke test trên bản live: đổi refresh token, `/me`, trang `/hoc`, tái sử dụng token cũ → 401, tự renew khi access hết hạn, đăng xuất, CSRF → 403.
- **Chưa kiểm thử với Google thật** (cần client ID/secret).

## 6. Lưu ý
- Nội dung [Điều khoản](../apps/web/src/app/(legal)/dieu-khoan/page.tsx) và [Chính sách bảo mật](../apps/web/src/app/(legal)/chinh-sach-bao-mat/page.tsx) là bản nháp cơ bản, **cần bổ sung thông tin đơn vị vận hành, email liên hệ và nhờ luật sư rà soát** trước khi ra mắt chính thức.
- Khi đổi nội dung điều khoản, tăng `ConsentVersion` trong [service.go](../apps/api/internal/auth/service.go) và xin lại đồng ý nếu cần.
