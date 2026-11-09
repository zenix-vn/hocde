-- Khóa tạm khi nhập sai PIN phụ huynh nhiều lần
ALTER TABLE users
  ADD COLUMN pin_failed_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN pin_locked_until TIMESTAMPTZ;
