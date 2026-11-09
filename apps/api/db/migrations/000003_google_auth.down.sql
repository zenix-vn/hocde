DROP INDEX IF EXISTS refresh_tokens_user_idx;
ALTER TABLE users
  DROP COLUMN IF EXISTS google_sub,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS consent_version,
  DROP COLUMN IF EXISTS last_login_at;
-- password_hash giữ nullable (không thể SET NOT NULL nếu đã có tài khoản Google)
