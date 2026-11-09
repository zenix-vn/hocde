DROP INDEX IF EXISTS users_created_idx;
DROP INDEX IF EXISTS audit_logs_created_idx;
ALTER TABLE users DROP COLUMN IF EXISTS disabled_at;
