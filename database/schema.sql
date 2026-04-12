CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worksheet_status') THEN
    CREATE TYPE worksheet_status AS ENUM ('draft', 'partial', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worksheet_difficulty') THEN
    CREATE TYPE worksheet_difficulty AS ENUM ('easy', 'medium', 'hard');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worksheet_size') THEN
    CREATE TYPE worksheet_size AS ENUM ('small', 'medium', 'large');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worksheet_source') THEN
    CREATE TYPE worksheet_source AS ENUM ('generated', 'imported');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operation_symbol') THEN
    CREATE TYPE operation_symbol AS ENUM ('+', '-', '*', '/');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status worksheet_status NOT NULL DEFAULT 'draft',
  difficulty worksheet_difficulty NOT NULL,
  problem_count INTEGER NOT NULL CHECK (problem_count > 0),
  allowed_operations TEXT[] NOT NULL,
  number_range_min INTEGER NOT NULL,
  number_range_max INTEGER NOT NULL,
  worksheet_size worksheet_size NOT NULL,
  clean_division_only BOOLEAN NOT NULL DEFAULT TRUE,
  source worksheet_source NOT NULL DEFAULT 'generated',
  local_import_key TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (user_id, local_import_key)
);

CREATE TABLE IF NOT EXISTS worksheet_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  operation operation_symbol NOT NULL,
  left_operand INTEGER NOT NULL,
  right_operand INTEGER NOT NULL,
  display_text TEXT NOT NULL,
  correct_answer NUMERIC NOT NULL,
  UNIQUE (worksheet_id, question_order)
);

CREATE TABLE IF NOT EXISTS worksheet_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status worksheet_status NOT NULL DEFAULT 'draft',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score_correct INTEGER NOT NULL DEFAULT 0,
  score_total INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS worksheet_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES worksheet_attempts(id) ON DELETE CASCADE,
  worksheet_question_id UUID NOT NULL REFERENCES worksheet_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  UNIQUE (attempt_id, worksheet_question_id)
);

CREATE TABLE IF NOT EXISTS user_statistics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  worksheets_completed INTEGER NOT NULL DEFAULT 0,
  problems_solved INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worksheets_user_status ON worksheets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_worksheets_submitted_at ON worksheets(submitted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_user_completed_at ON worksheet_attempts(user_id, completed_at);
