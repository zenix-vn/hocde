# 03. Thiết kế cơ sở dữ liệu (PostgreSQL 16)

## 1. ERD rút gọn

```
users(parent) 1──n profiles(child) 1──n lesson_progress n──1 lessons
                         │                                       │
                         ├─n attempts (bài tập)                  n
                         ├─n profile_badges n──1 badges     units n──1 courses n──1 subjects
                         ├─n daily_activity                      │
                         └─n xp_events                      lesson_blocks (hoặc JSONB)

courses = (subject, grade)   VD: Toán lớp 2
exercises (nằm trong lesson.content, có bảng exercises để chấm & thống kê)
```

## 2. Schema SQL

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- tìm kiếm

-- ========== TÀI KHOẢN ==========
CREATE TYPE user_role AS ENUM ('parent','teacher','editor','admin');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                 -- argon2id
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'parent',
  parent_pin_hash TEXT,                        -- PIN 4-6 số để mở khóa khu phụ huynh
  email_verified_at TIMESTAMPTZ,
  consent_at    TIMESTAMPTZ,                   -- đồng ý xử lý dữ liệu trẻ em
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hồ sơ học sinh (con)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,                  -- tên hiển thị/biệt danh, không cần tên thật
  avatar_key   TEXT NOT NULL DEFAULT 'fox',    -- linh vật/avatar
  grade        SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 9),
  birth_year   SMALLINT,
  daily_limit_minutes SMALLINT,                -- giới hạn thời gian, NULL = không giới hạn
  total_xp     INT NOT NULL DEFAULT 0,
  stars        INT NOT NULL DEFAULT 0,
  level        SMALLINT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX ON profiles(parent_id);

-- ========== NỘI DUNG ==========
CREATE TABLE subjects (
  id          SMALLSERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,           -- toan, tieng-viet, tieng-anh, python
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL,                  -- mã màu chủ đạo của môn
  icon_key    TEXT NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TYPE content_status AS ENUM ('draft','review','published','archived');

-- Khóa học = Môn x Lớp
CREATE TABLE courses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id SMALLINT NOT NULL REFERENCES subjects(id),
  grade      SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 9),
  slug       TEXT NOT NULL,                   -- toan-lop-2
  title      TEXT NOT NULL,
  summary    TEXT,
  cover_url  TEXT,
  status     content_status NOT NULL DEFAULT 'draft',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (subject_id, grade),
  UNIQUE (slug)
);

CREATE TABLE units (                          -- Chương
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  summary    TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX ON units(course_id, sort_order);

CREATE TABLE lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  summary     TEXT,
  thumbnail_url TEXT,
  est_minutes SMALLINT NOT NULL DEFAULT 5,
  xp_reward   SMALLINT NOT NULL DEFAULT 20,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  status      content_status NOT NULL DEFAULT 'draft',
  content     JSONB NOT NULL DEFAULT '{"blocks":[]}',   -- xem 07-bai-hoc-tuong-tac.md
  version     INT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  author_id   UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON lessons(unit_id, sort_order);
CREATE INDEX lessons_title_trgm ON lessons USING gin (title gin_trgm_ops);

-- Điều kiện mở khóa (bài trước phải đạt >= 1 sao)
CREATE TABLE lesson_prerequisites (
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  requires_lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, requires_lesson_id)
);

-- Bài tập: bản đã "trích" từ content để chấm điểm phía server
CREATE TABLE exercises (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_key  TEXT NOT NULL,                   -- id block trong content
  type       TEXT NOT NULL,                   -- mcq, fill_blank, match, order, drag_drop, number_input, code, ...
  skill_tag  TEXT,                            -- VD: "cong-co-nho" cho ôn tập thông minh
  difficulty SMALLINT NOT NULL DEFAULT 1,
  answer_key JSONB NOT NULL,                  -- đáp án (KHÔNG gửi xuống client)
  points     SMALLINT NOT NULL DEFAULT 10,
  UNIQUE (lesson_id, block_key)
);

-- ========== TIẾN ĐỘ ==========
CREATE TABLE lesson_progress (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  stars      SMALLINT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_score SMALLINT NOT NULL DEFAULT 0,      -- 0..100
  last_block_key TEXT,                         -- tiếp tục học dở
  time_spent_sec INT NOT NULL DEFAULT 0,
  attempts_count INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE TABLE attempts (                        -- mỗi lần trả lời một bài tập
  id          BIGSERIAL PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  is_correct  BOOLEAN NOT NULL,
  response    JSONB NOT NULL,
  time_ms     INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON attempts(profile_id, created_at DESC);
CREATE INDEX ON attempts(exercise_id);

-- Lịch sử XP và hoạt động theo ngày (cho streak, biểu đồ)
CREATE TABLE xp_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,                        -- lesson_complete, perfect, daily_quest ...
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_activity (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  minutes_spent SMALLINT NOT NULL DEFAULT 0,
  lessons_completed SMALLINT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, day)
);

-- ========== GAMIFICATION ==========
CREATE TABLE badges (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                   -- streak_7, first_lesson, math_master
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  rule JSONB NOT NULL                          -- {"type":"streak","value":7}
);

CREATE TABLE profile_badges (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id SMALLINT REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, badge_id)
);

-- Ôn tập thông minh (giai đoạn 2)
CREATE TABLE review_items (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  box SMALLINT NOT NULL DEFAULT 1,             -- Leitner 1..5
  due_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (profile_id, exercise_id)
);
CREATE INDEX ON review_items(profile_id, due_at);

-- ========== LỚP HỌC (giai đoạn 2) ==========
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  grade SMALLINT NOT NULL
);
CREATE TABLE classroom_members (
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, profile_id)
);
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  due_at TIMESTAMPTZ
);

-- ========== MEDIA ==========
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('image','audio','video','lottie','other')),
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT, size_bytes BIGINT, alt_text TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== AUDIT ==========
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID, action TEXT NOT NULL, entity TEXT, entity_id TEXT,
  meta JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Ghi chú thiết kế
- **Tách `content` JSONB và `exercises`**: client chỉ nhận `content` đã **loại bỏ đáp án**; `answer_key` nằm ở `exercises` và chỉ server đọc. Khi publish bài, service parse `content.blocks` → upsert `exercises`.
- **Version nội dung**: tăng `version` mỗi lần sửa; tiến độ vẫn gắn `lesson_id`. Có thể thêm bảng `lesson_revisions` để lưu lịch sử.
- **Streak**: cập nhật trong transaction khi `complete` bài: nếu `last_active_date = today-1` → +1; `= today` → giữ; còn lại → reset 1.
- **Sao**: ≥90% = 3⭐, ≥70% = 2⭐, ≥40% = 1⭐ (xem 08).
- **Xoá mềm** (`deleted_at`) cho users/profiles; job xoá vĩnh viễn sau 30 ngày theo yêu cầu phụ huynh.
- **Index & partition**: `attempts`, `xp_events` có thể partition theo tháng khi lớn.
- **Migration**: `golang-migrate`, file `000001_init.up.sql` / `.down.sql`.

## 4. Ví dụ truy vấn sqlc
```sql
-- name: ListUnitsWithProgress :many
SELECT u.id, u.title, l.id AS lesson_id, l.title AS lesson_title, l.slug,
       COALESCE(lp.stars,0) AS stars, COALESCE(lp.status,'new') AS status
FROM units u
JOIN lessons l ON l.unit_id = u.id AND l.status = 'published'
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.profile_id = $2
WHERE u.course_id = $1
ORDER BY u.sort_order, l.sort_order;
```
