-- Quản trị: khoá tài khoản, nhật ký thao tác truy vấn nhanh theo thời gian
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMPTZ;
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX users_created_idx ON users(created_at DESC);
