# 09. Bảo mật & an toàn trẻ em

## 1. Dữ liệu cá nhân trẻ em (Nghị định 13/2023/NĐ-CP)
- Chỉ **phụ huynh** tạo tài khoản; trẻ dùng **hồ sơ** không cần email, không hỏi họ tên thật, địa chỉ, số điện thoại.
- Thu thập tối thiểu: biệt danh, năm sinh/lớp, tiến độ học. Không thu thập vị trí, danh bạ, ảnh thật.
- Màn **đồng ý** rõ ràng khi đăng ký (lưu `consent_at`, phiên bản chính sách).
- Quyền của phụ huynh: xem, xuất (JSON), sửa, xoá toàn bộ dữ liệu con (xoá mềm 30 ngày rồi xoá vĩnh viễn).
- Không dùng dữ liệu trẻ cho quảng cáo; không bán/chia sẻ cho bên thứ ba; analytics ẩn danh, không cookie quảng cáo.
- Trang Chính sách bảo mật & Điều khoản bằng ngôn ngữ dễ hiểu.

## 2. Xác thực & phiên
- Mật khẩu: **argon2id**, tối thiểu 8 ký tự, kiểm tra mật khẩu bị lộ (HIBP k-anonymity, tuỳ chọn).
- Access JWT 15 phút (HS256/EdDSA); refresh token ngẫu nhiên 256-bit, **lưu hash**, xoay vòng mỗi lần dùng, phát hiện tái sử dụng → thu hồi cả chuỗi.
- Cookie refresh: `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`.
- **PIN phụ huynh** (4–6 số, hash + khoá tạm sau 5 lần sai) để vào khu phụ huynh/đổi cài đặt.
- Xác minh email; chống brute-force: rate limit + backoff.

## 3. Bảo vệ ứng dụng (OWASP)
| Rủi ro | Biện pháp |
|---|---|
| Injection | `sqlc`/pgx tham số hoá; không nối chuỗi SQL |
| XSS | React escape mặc định; render Markdown qua `rehype-sanitize`; CSP chặt (`script-src 'self'` + nonce); không `dangerouslySetInnerHTML` với dữ liệu thô |
| CSRF | SameSite cookie + header tuỳ chỉnh/`Origin` check cho endpoint dùng cookie |
| IDOR | Mọi truy vấn hồ sơ kiểm `profile.parent_id = user.id` |
| Gian lận điểm | Đáp án chỉ ở server; chấm ở server |
| Upload | Giới hạn loại/kích thước, quét MIME, lưu S3 với tên ngẫu nhiên, chỉ editor |
| DoS | Rate limit, body limit, timeout, phân trang |
| Bí mật | Biến môi trường/secret manager; không commit `.env` |
| Phụ thuộc | Dependabot, `govulncheck`, `pnpm audit` |

Header: `helmet` (Fiber) + `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (tắt camera/mic mặc định; chỉ xin mic ở bài "Đọc to" khi trẻ bấm).

## 4. Chạy code Python an toàn
Code của trẻ chạy **trong trình duyệt** (Pyodide + Worker), không gửi lên server thực thi → không có RCE phía server. Giới hạn thời gian/bộ nhớ, whitelist module. Server chỉ nhận kết quả test (và có thể chạy lại trong sandbox WASM riêng nếu cần xác minh chính thức).

## 5. Nội dung & tương tác
- **Không có chat tự do / bình luận công khai** giữa trẻ em. Mọi văn bản do trẻ nhập chỉ hiển thị cho chính trẻ/phụ huynh.
- Biệt danh qua bộ lọc từ cấm (tiếng Việt có dấu/không dấu).
- Trợ giảng AI (GĐ3): chỉ trả lời trong phạm vi bài, lọc nội dung, log để phụ huynh xem.
- Video nhúng dùng `youtube-nocookie` hoặc tự host, không quảng cáo.

## 6. Hạ tầng
- TLS mọi nơi; DB không public; user DB quyền tối thiểu; backup mã hoá hằng ngày (PITR) và thử khôi phục định kỳ.
- Log không chứa mật khẩu/token/PII; masking email.
- Audit log cho thao tác CMS/Admin.

## 7. Checklist trước khi ra mắt
- [ ] Pen-test cơ bản (ZAP) + rà soát CSP
- [ ] Chính sách bảo mật & điều khoản, cơ chế xoá dữ liệu
- [ ] Giới hạn thời gian & nhắc nghỉ hoạt động
- [ ] Sao lưu/khôi phục thử thành công
- [ ] Kiểm tra a11y (axe) và thiết bị thật (tablet Android, iPad)
