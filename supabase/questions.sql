-- EduOrbit: Questions cache table (external sources)
-- Safe to run on an existing database (no drops).

-- 1) Table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  slug TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL CHECK (source IN ('leetcode', 'gfg'))
);

-- 2) Indexes (for fast filters/search + upsert conflict target)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_slug ON public.questions(source, slug);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_source ON public.questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_title ON public.questions(title);

-- 3) RLS (allow public read)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Questions are viewable by everyone" ON public.questions
  FOR SELECT
  USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
