CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('parent','teacher','editor','admin');
CREATE TYPE content_status AS ENUM ('draft','review','published','archived');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  parent_pin_hash TEXT,
  email_verified_at TIMESTAMPTZ,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_key TEXT NOT NULL DEFAULT 'book',
  grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 9),
  birth_year SMALLINT,
  daily_limit_minutes SMALLINT,
  total_xp INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  level SMALLINT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX ON profiles(parent_id);

CREATE TABLE subjects (
  id SMALLSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id SMALLINT NOT NULL REFERENCES subjects(id),
  grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 9),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  cover_url TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (subject_id, grade)
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX ON units(course_id, sort_order);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail_url TEXT,
  est_minutes SMALLINT NOT NULL DEFAULT 5,
  xp_reward SMALLINT NOT NULL DEFAULT 20,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{"schema":1,"blocks":[]}',
  version INT NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON lessons(unit_id, sort_order);
CREATE INDEX lessons_title_trgm ON lessons USING gin (title gin_trgm_ops);

CREATE TABLE lesson_prerequisites (
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  requires_lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, requires_lesson_id)
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  type TEXT NOT NULL,
  skill_tag TEXT,
  difficulty SMALLINT NOT NULL DEFAULT 1,
  answer_key JSONB NOT NULL,
  points SMALLINT NOT NULL DEFAULT 10,
  UNIQUE (lesson_id, block_key)
);

CREATE TABLE lesson_progress (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  stars SMALLINT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_score SMALLINT NOT NULL DEFAULT 0,
  last_block_key TEXT,
  time_spent_sec INT NOT NULL DEFAULT 0,
  attempts_count INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE TABLE attempts (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  response JSONB NOT NULL,
  time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON attempts(profile_id, created_at DESC);
CREATE INDEX ON attempts(exercise_id);

CREATE TABLE xp_events (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
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

CREATE TABLE badges (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  rule JSONB NOT NULL
);

CREATE TABLE profile_badges (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id SMALLINT REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, badge_id)
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('image','audio','video','lottie','other')),
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime TEXT,
  size_bytes BIGINT,
  alt_text TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
