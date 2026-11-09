-- Đăng nhập bằng Google: tài khoản không cần mật khẩu
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users
  ADD COLUMN google_sub TEXT UNIQUE,
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN consent_version TEXT,
  ADD COLUMN last_login_at TIMESTAMPTZ;
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
