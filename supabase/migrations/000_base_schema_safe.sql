-- ============================================================================
-- EduOrbit base schema, NON-DESTRUCTIVE version of supabase/database-schema.sql.
-- Safe on existing projects: never drops or truncates anything. It only creates
-- what is missing. Policies, functions and triggers are created only if they
-- do not already exist, so later hardening (003/004) is never overwritten.
-- Run this first, then migrations 001 .. 004 in order.
-- ============================================================================

-- ======================== TABLES ========================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  phone TEXT,
  total_points INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  badges JSONB DEFAULT '[]'::jsonb,
  banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  channel_title TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  view_count INTEGER DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);

CREATE TABLE IF NOT EXISTS coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  category TEXT DEFAULT 'DSA',
  type TEXT DEFAULT 'code' CHECK (type IN ('mcq', 'code', 'sql', 'project')),
  tags TEXT[] DEFAULT '{}',
  starter_code JSONB DEFAULT '{}'::jsonb,
  test_cases JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  constraints TEXT[] DEFAULT '{}',
  mcq_options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT DEFAULT '',
  points INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  is_daily_challenge BOOLEAN DEFAULT false,
  daily_challenge_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_problems_slug ON coding_problems(slug);
CREATE INDEX IF NOT EXISTS idx_coding_problems_category ON coding_problems(category);
CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_coding_problems_type ON coding_problems(type);
CREATE INDEX IF NOT EXISTS idx_coding_problems_daily ON coding_problems(daily_challenge_date);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  slug TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL CHECK (source IN ('leetcode', 'gfg'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_source_slug ON questions(source, slug);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_title ON questions(title);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  contest_id UUID,
  language TEXT DEFAULT 'javascript',
  code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'wrong_answer', 'runtime_error', 'time_limit')),
  execution_time REAL DEFAULT 0,
  test_results JSONB DEFAULT '[]'::jsonb,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contest_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

CREATE TABLE IF NOT EXISTS contest_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  points INTEGER DEFAULT 100,
  UNIQUE(contest_id, problem_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  last_submission_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT DEFAULT 'login',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT,
  video_title TEXT,
  is_educational BOOLEAN DEFAULT false,
  confidence_score REAL DEFAULT 0,
  reason TEXT DEFAULT '',
  ai_provider TEXT DEFAULT 'mock',
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'attempted' CHECK (status IN ('solved', 'attempted')),
  language_used TEXT DEFAULT 'javascript',
  score INTEGER DEFAULT 0,
  submitted_code TEXT DEFAULT '',
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(user_id, status);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES coding_problems(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);


-- ======================== ROW LEVEL SECURITY ========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policies are added only to tables that have no policies yet (i.e. new tables).
-- Tables that already have policies keep them untouched (incl. hardening from 003).
DO $$
DECLARE
  p RECORD;
  has_policies TEXT[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT tablename::text), '{}') INTO has_policies
  FROM pg_policies WHERE schemaname = 'public';

  FOR p IN
    SELECT * FROM (VALUES
      ('profiles', 'Profiles are viewable by everyone', 'FOR SELECT USING (true)'),
      ('profiles', 'Users can update own profile', 'FOR UPDATE USING (auth.uid() = id)'),
      ('videos', 'Approved videos are viewable by everyone', 'FOR SELECT USING (true)'),
      ('videos', 'Authenticated users can submit videos', 'FOR INSERT WITH CHECK (auth.role() = ''authenticated'')'),
      ('videos', 'Service role can update videos', 'FOR UPDATE USING (true)'),
      ('coding_problems', 'Problems are viewable by everyone', 'FOR SELECT USING (true)'),
      ('coding_problems', 'Service role can manage problems', 'FOR ALL USING (true)'),
      ('questions', 'Questions are viewable by everyone', 'FOR SELECT USING (true)'),
      ('submissions', 'Users can view own submissions', 'FOR SELECT USING (auth.uid() = user_id)'),
      ('submissions', 'Users can insert own submissions', 'FOR INSERT WITH CHECK (auth.uid() = user_id)'),
      ('contests', 'Contests are viewable by everyone', 'FOR SELECT USING (true)'),
      ('contests', 'Service role can manage contests', 'FOR ALL USING (true)'),
      ('contest_participants', 'Participants viewable by all', 'FOR SELECT USING (true)'),
      ('contest_participants', 'Users can join contests', 'FOR INSERT WITH CHECK (auth.uid() = user_id)'),
      ('contest_problems', 'Contest problems viewable by all', 'FOR SELECT USING (true)'),
      ('leaderboard_entries', 'Leaderboard viewable by all', 'FOR SELECT USING (true)'),
      ('leaderboard_entries', 'Service role can manage leaderboard', 'FOR ALL USING (true)'),
      ('streaks', 'Users can view own streaks', 'FOR SELECT USING (auth.uid() = user_id)'),
      ('streaks', 'Users can insert own streaks', 'FOR INSERT WITH CHECK (auth.uid() = user_id)'),
      ('streaks', 'Users can update own streaks', 'FOR UPDATE USING (auth.uid() = user_id)'),
      ('reports', 'Users can insert reports', 'FOR INSERT WITH CHECK (auth.uid() = reporter_id)'),
      ('reports', 'Service role can manage reports', 'FOR SELECT USING (true)'),
      ('reports', 'Service role can update reports', 'FOR UPDATE USING (true)'),
      ('ai_verification_logs', 'Service role can manage ai logs', 'FOR ALL USING (true)'),
      ('bookmarks', 'Users can view own bookmarks', 'FOR SELECT USING (auth.uid() = user_id)'),
      ('bookmarks', 'Users can insert own bookmarks', 'FOR INSERT WITH CHECK (auth.uid() = user_id)'),
      ('bookmarks', 'Users can delete own bookmarks', 'FOR DELETE USING (auth.uid() = user_id)'),
      ('user_progress', 'Users can view own progress', 'FOR SELECT USING (auth.uid() = user_id)'),
      ('user_progress', 'Users can insert own progress', 'FOR INSERT WITH CHECK (auth.uid() = user_id)'),
      ('user_progress', 'Users can update own progress', 'FOR UPDATE USING (auth.uid() = user_id)'),
      ('daily_challenges', 'Daily challenges viewable by all', 'FOR SELECT USING (true)'),
      ('daily_challenges', 'Service role can manage daily challenges', 'FOR ALL USING (true)')
    ) AS t(tbl, pol, ddl)
  LOOP
    IF NOT (p.tbl = ANY (has_policies)) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I %s', p.pol, p.tbl, p.ddl);
    END IF;
  END LOOP;
END $$;


-- ======================== REALTIME ========================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE submissions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ======================== FUNCTIONS & TRIGGERS ========================
-- Created only if missing. handle_new_user is later replaced by migration 004,
-- so an existing version must never be overwritten here.

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $body$
      DECLARE
        _username TEXT;
        _full_name TEXT;
        _avatar TEXT;
        _phone TEXT;
      BEGIN
        _username := COALESCE(
          NULLIF(NEW.raw_user_meta_data->>'username', ''),
          NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
          CASE WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1) END,
          CASE WHEN NEW.phone IS NOT NULL AND NEW.phone != '' THEN 'user_' || RIGHT(NEW.phone, 4) END,
          'user_' || LEFT(NEW.id::text, 8)
        );
        _full_name := COALESCE(
          NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
          NULLIF(NEW.raw_user_meta_data->>'name', ''),
          CASE WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1) END,
          _username
        );
        _avatar := COALESCE(
          NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
          NULLIF(NEW.raw_user_meta_data->>'picture', ''),
          ''
        );
        _phone := COALESCE(NEW.phone, '');
        INSERT INTO public.profiles (id, username, full_name, avatar_url, phone)
        VALUES (NEW.id, _username, _full_name, _avatar, _phone);
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_problem_slug'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.generate_problem_slug()
      RETURNS TRIGGER AS $body$
      BEGIN
        IF NEW.slug IS NULL OR NEW.slug = '' THEN
          NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
          NEW.slug := trim(BOTH '-' FROM NEW.slug);
          IF EXISTS (SELECT 1 FROM coding_problems WHERE slug = NEW.slug AND id != NEW.id) THEN
            NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 6);
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_on_progress'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.update_user_stats_on_progress()
      RETURNS TRIGGER AS $body$
      DECLARE
        solved_count INTEGER;
        total_score INTEGER;
      BEGIN
        IF NEW.status = 'solved' THEN
          SELECT COUNT(*), COALESCE(SUM(score), 0)
          INTO solved_count, total_score
          FROM user_progress
          WHERE user_id = NEW.user_id AND status = 'solved';
          UPDATE profiles SET
            problems_solved = solved_count,
            total_points = total_score,
            updated_at = now()
          WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER
    $fn$;
  END IF;
END
$outer$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_generate_problem_slug' AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_generate_problem_slug
      BEFORE INSERT OR UPDATE ON public.coding_problems
      FOR EACH ROW EXECUTE FUNCTION public.generate_problem_slug();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_user_stats' AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_update_user_stats
      AFTER INSERT OR UPDATE ON public.user_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_on_progress();
  END IF;
END $$;
