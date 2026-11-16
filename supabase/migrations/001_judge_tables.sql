-- 001_judge_tables.sql
-- Additive only. Real code judge: problem tests (hidden ones never readable by clients),
-- judged submissions, and per-user editor drafts.
-- Run in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- coding_problems: extra columns (all nullable or defaulted)
-- ---------------------------------------------------------------------------
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS time_limit_ms   INTEGER DEFAULT 2000;
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS memory_limit_kb INTEGER DEFAULT 262144;
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS input_format    TEXT    DEFAULT '';
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS output_format   TEXT    DEFAULT '';
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS editorial       TEXT    DEFAULT '';
-- true once the problem has stdin/stdout tests in problem_tests
ALTER TABLE coding_problems ADD COLUMN IF NOT EXISTS judged          BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- problem_tests: stdin/stdout test cases
-- Sample tests (is_sample = true) are public. Hidden tests have NO select policy,
-- so only the service role (server API routes) can read them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS problem_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  is_sample       BOOLEAN NOT NULL DEFAULT false,
  input           TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (problem_id, position)
);
CREATE INDEX IF NOT EXISTS idx_problem_tests_problem ON problem_tests(problem_id);

ALTER TABLE problem_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sample tests are public" ON problem_tests;
CREATE POLICY "Sample tests are public" ON problem_tests FOR SELECT USING (is_sample = true);

-- ---------------------------------------------------------------------------
-- judge_submissions: every Run and Submit. Written only by the server (service role).
-- results holds per-test verdicts WITHOUT hidden inputs or expected outputs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judge_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id      UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  contest_id      UUID REFERENCES contests(id) ON DELETE SET NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('run', 'submit')),
  language        TEXT NOT NULL,
  code            TEXT NOT NULL,
  verdict         TEXT NOT NULL CHECK (verdict IN (
                    'accepted', 'wrong_answer', 'compilation_error', 'runtime_error',
                    'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error')),
  passed_count    INTEGER NOT NULL DEFAULT 0,
  total_count     INTEGER NOT NULL DEFAULT 0,
  runtime_ms      INTEGER,
  memory_kb       INTEGER,
  compile_output  TEXT,
  results         JSONB NOT NULL DEFAULT '[]'::jsonb,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_judge_subs_user_problem ON judge_submissions(user_id, problem_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_judge_subs_user_recent  ON judge_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_judge_subs_accepted     ON judge_submissions(user_id, problem_id)
  WHERE kind = 'submit' AND verdict = 'accepted';

ALTER TABLE judge_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own judge submissions" ON judge_submissions;
CREATE POLICY "Users read own judge submissions" ON judge_submissions FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: clients can never write verdicts.

-- ---------------------------------------------------------------------------
-- judge_drafts: Ctrl+S saves the editor contents per user, problem and language
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judge_drafts (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  language   TEXT NOT NULL,
  code       TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id, language),
  CONSTRAINT judge_drafts_code_size CHECK (char_length(code) <= 65536)
);

ALTER TABLE judge_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own drafts" ON judge_drafts;
CREATE POLICY "Users manage own drafts" ON judge_drafts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
