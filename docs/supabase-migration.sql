-- ═══════════════════════════════════════════════════════════════
-- Study Diary — Supabase Migration
-- ═══════════════════════════════════════════════════════════════
--
-- Run this SQL in your Supabase Dashboard → SQL Editor → New Query
--
-- This creates two tables:
--   1. "users" — Student registration and profile data
--   2. "progress" — Topic completion tracking
--
-- After running this, add these env vars to your .env:
--   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
--   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
-- ═══════════════════════════════════════════════════════════════

-- ─── Users Table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 10,
  board TEXT NOT NULL DEFAULT 'BISE Abbottabad',
  field TEXT NOT NULL DEFAULT 'Science',
  status TEXT NOT NULL DEFAULT 'free',  -- 'free', 'paid', 'blocked'
  academic_group TEXT NOT NULL DEFAULT 'Pre-Medical',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  current_day INTEGER NOT NULL DEFAULT 1,
  total_days INTEGER NOT NULL DEFAULT 438,
  pacing_goal TEXT NOT NULL DEFAULT '5M',  -- '3M', '5M', '6M'
  topics_done INTEGER NOT NULL DEFAULT 0,
  days_left INTEGER NOT NULL DEFAULT 438,
  topics_per_day INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast phone lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ─── Progress Table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS progress (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  date_completed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One progress record per phone+topic
  UNIQUE(phone, topic_id)
);

-- Index for fast progress lookups
CREATE INDEX IF NOT EXISTS idx_progress_phone ON progress(phone);
CREATE INDEX IF NOT EXISTS idx_progress_phone_completed ON progress(phone, completed);

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Enable RLS but allow all operations with the service role key
-- (our backend uses the service role key, so RLS is bypassed)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads/writes (our API handles auth logic)
-- If you want stricter security, you can remove these policies
-- and only use the service role key from the backend.

CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on progress" ON progress
  FOR ALL USING (true) WITH CHECK (true);

-- ─── Auto-update updated_at timestamp ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- DONE! Your Supabase database is ready.
-- ═══════════════════════════════════════════════════════════════
