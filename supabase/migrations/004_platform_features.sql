-- 004_platform_features.sql
-- Run AFTER 001, 002 and 003 (paste into the Supabase SQL editor). Safe to run more than once.
-- It only ADDS tables, columns, functions and policies, plus these data changes, each explained:
--   * profiles.phone is blanked: it was readable by everyone through the public profiles policy,
--     and the same number is still stored privately in auth.users.
--   * coding_problems.editorial is copied into problem_editorials and then blanked, so editorials
--     can be hidden while a contest that uses the problem is live. The source text also lives in
--     scripts/questions/bank_*.py, and nothing is lost: it is copied first.
--
-- Contents
--   1. Sign-up trigger: unique usernames (a clash used to make sign-up fail)
--   2. Profile columns: timezone; streak columns become server-owned
--   3. Streaks: record_activity() / my_streak()
--   4. Contest fairness: hide upcoming contest problems, gate editorials during live contests
--   5. Study timer (server-recorded), goals and planner
--   6. AI usage log (rate limiting) and contact messages
--   7. Badge id clean-up

-- ======================== 1. SIGN-UP TRIGGER ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _base TEXT;
  _username TEXT;
  _full_name TEXT;
  _avatar TEXT;
  _n INT := 0;
BEGIN
  _base := lower(regexp_replace(
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
      CASE WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN split_part(NEW.email, '@', 1) END,
      'user_' || LEFT(NEW.id::text, 8)
    ), '[^a-zA-Z0-9_]', '', 'g'));
  IF length(_base) < 3 THEN _base := 'user_' || LEFT(NEW.id::text, 8); END IF;
  _base := LEFT(_base, 20);

  _username := _base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) LOOP
    _n := _n + 1;
    _username := LEFT(_base, 15) || '_' || (floor(random() * 9000) + 1000)::int;
    EXIT WHEN _n > 25;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) THEN
    _username := 'user_' || replace(NEW.id::text, '-', '');
  END IF;

  _full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    _username
  );
  _avatar := COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), NULLIF(NEW.raw_user_meta_data->>'picture', ''), '');

  -- No phone number here: profiles are publicly readable. It stays in auth.users.
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (NEW.id, _username, LEFT(_full_name, 100), _avatar);
  RETURN NEW;
END $$;

UPDATE public.profiles SET phone = '' WHERE phone IS NOT NULL AND phone <> '';

-- ======================== 2. PROFILE COLUMNS ========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Streak columns are now written only by the server-side functions below.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() OR current_setting('eduorbit.system_write', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF NEW.role            IS DISTINCT FROM OLD.role
  OR NEW.banned          IS DISTINCT FROM OLD.banned
  OR NEW.total_points    IS DISTINCT FROM OLD.total_points
  OR NEW.problems_solved IS DISTINCT FROM OLD.problems_solved
  OR NEW.badges          IS DISTINCT FROM OLD.badges
  OR NEW.current_streak  IS DISTINCT FROM OLD.current_streak
  OR NEW.longest_streak  IS DISTINCT FROM OLD.longest_streak
  OR NEW.last_active_date IS DISTINCT FROM OLD.last_active_date THEN
    RAISE EXCEPTION 'protected_profile_column';
  END IF;
  RETURN NEW;
END $$;

-- ======================== 3. STREAKS ========================
-- Users no longer write streak rows directly.
DROP POLICY IF EXISTS "Users can insert own streaks" ON public.streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON public.streaks;

CREATE OR REPLACE FUNCTION public._streak_for(p_user UUID, p_today DATE)
RETURNS TABLE (current_streak INT, longest_streak INT, active_today BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (
    SELECT activity_date, activity_date - (row_number() OVER (ORDER BY activity_date))::int AS grp
    FROM public.streaks WHERE user_id = p_user
  ), islands AS (
    SELECT count(*)::int AS len, max(activity_date) AS last_day FROM d GROUP BY grp
  )
  SELECT
    COALESCE((SELECT len FROM islands WHERE last_day >= p_today - 1 ORDER BY last_day DESC LIMIT 1), 0),
    COALESCE((SELECT max(len) FROM islands), 0),
    EXISTS (SELECT 1 FROM public.streaks WHERE user_id = p_user AND activity_date = p_today)
$$;

CREATE OR REPLACE FUNCTION public._record_activity(p_user UUID, p_type TEXT, p_tz TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tz TEXT := COALESCE((SELECT name FROM pg_timezone_names WHERE name = p_tz LIMIT 1), 'UTC');
  _today DATE := (now() AT TIME ZONE _tz)::date;
  _s RECORD;
BEGIN
  INSERT INTO public.streaks (user_id, activity_date, activity_type)
  VALUES (p_user, _today, LEFT(COALESCE(p_type, 'activity'), 20))
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT * INTO _s FROM public._streak_for(p_user, _today);
  PERFORM set_config('eduorbit.system_write', '1', true);
  UPDATE public.profiles
     SET current_streak = _s.current_streak,
         longest_streak = GREATEST(COALESCE(longest_streak, 0), _s.longest_streak),
         last_active_date = _today,
         timezone = _tz
   WHERE id = p_user;
  PERFORM set_config('eduorbit.system_write', '', true);
END $$;
REVOKE ALL ON FUNCTION public._record_activity(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._record_activity(UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.record_activity(p_type TEXT DEFAULT 'activity', p_tz TEXT DEFAULT 'UTC')
RETURNS TABLE (current_streak INT, longest_streak INT, active_today BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tz TEXT := COALESCE((SELECT name FROM pg_timezone_names WHERE name = p_tz LIMIT 1), 'UTC');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM public._record_activity(auth.uid(), p_type, _tz);
  RETURN QUERY SELECT * FROM public._streak_for(auth.uid(), (now() AT TIME ZONE _tz)::date);
END $$;
REVOKE ALL ON FUNCTION public.record_activity(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_activity(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_streak(p_tz TEXT DEFAULT 'UTC')
RETURNS TABLE (current_streak INT, longest_streak INT, active_today BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tz TEXT := COALESCE((SELECT name FROM pg_timezone_names WHERE name = p_tz LIMIT 1), 'UTC');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN QUERY SELECT * FROM public._streak_for(auth.uid(), (now() AT TIME ZONE _tz)::date);
END $$;
REVOKE ALL ON FUNCTION public.my_streak(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_streak(TEXT) TO authenticated;

-- ======================== 4. CONTEST FAIRNESS ========================
-- Problems of a contest that has not started are hidden (admins still see them).
DROP POLICY IF EXISTS "Contest problems viewable by all" ON public.contest_problems;
DROP POLICY IF EXISTS "Contest problems visible once started" ON public.contest_problems;
CREATE POLICY "Contest problems visible once started" ON public.contest_problems FOR SELECT USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.contests c WHERE c.id = contest_id AND c.start_time <= now())
);

DROP POLICY IF EXISTS "Admins manage contest problems" ON public.contest_problems;
CREATE POLICY "Admins manage contest problems" ON public.contest_problems FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.problem_in_live_contest(p_problem UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contest_problems cp JOIN public.contests c ON c.id = cp.contest_id
    WHERE cp.problem_id = p_problem AND c.start_time <= now() AND c.end_time > now()
  )
$$;
GRANT EXECUTE ON FUNCTION public.problem_in_live_contest(UUID) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.problem_editorials (
  problem_id UUID PRIMARY KEY REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.problem_editorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Editorials readable outside live contests" ON public.problem_editorials;
CREATE POLICY "Editorials readable outside live contests" ON public.problem_editorials FOR SELECT
  USING (public.is_admin() OR NOT public.problem_in_live_contest(problem_id));
DROP POLICY IF EXISTS "Admins manage editorials" ON public.problem_editorials;
CREATE POLICY "Admins manage editorials" ON public.problem_editorials FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.problem_editorials (problem_id, body)
SELECT id, editorial FROM public.coding_problems WHERE editorial IS NOT NULL AND editorial <> ''
ON CONFLICT (problem_id) DO NOTHING;
UPDATE public.coding_problems SET editorial = ''
 WHERE editorial <> '' AND EXISTS (SELECT 1 FROM public.problem_editorials e WHERE e.problem_id = coding_problems.id AND e.body = coding_problems.editorial);

-- ======================== 5. STUDY TIMER, GOALS, PLANNER ========================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT '' CHECK (char_length(topic) <= 80),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_resumed_at TIMESTAMPTZ,
  accumulated_seconds INT NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON public.study_sessions (user_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_study_sessions_one_open ON public.study_sessions (user_id) WHERE status <> 'completed';
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own study sessions" ON public.study_sessions;
CREATE POLICY "Users read own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own study sessions" ON public.study_sessions;
CREATE POLICY "Users delete own study sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Seconds counted so far; a session never counts more than 12 hours in one stretch.
CREATE OR REPLACE FUNCTION public._study_elapsed(s public.study_sessions)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT s.accumulated_seconds + CASE
    WHEN s.status = 'running' AND s.last_resumed_at IS NOT NULL
    THEN LEAST(GREATEST(extract(epoch FROM (now() - s.last_resumed_at))::int, 0), 43200)
    ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.study_current()
RETURNS TABLE (id UUID, topic TEXT, status TEXT, started_at TIMESTAMPTZ, elapsed_seconds INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN QUERY SELECT s.id, s.topic, s.status, s.started_at, public._study_elapsed(s)
    FROM public.study_sessions s WHERE s.user_id = auth.uid() AND s.status <> 'completed' LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION public.study_start(p_topic TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.study_sessions WHERE user_id = auth.uid() AND status <> 'completed') THEN
    RAISE EXCEPTION 'session_already_open';
  END IF;
  INSERT INTO public.study_sessions (user_id, topic, status, last_resumed_at)
  VALUES (auth.uid(), LEFT(btrim(COALESCE(p_topic, '')), 80), 'running', now())
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.study_pause()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.study_sessions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO s FROM public.study_sessions WHERE user_id = auth.uid() AND status = 'running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_running_session'; END IF;
  UPDATE public.study_sessions SET status = 'paused', accumulated_seconds = public._study_elapsed(s), last_resumed_at = NULL WHERE id = s.id;
END $$;

CREATE OR REPLACE FUNCTION public.study_resume()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.study_sessions SET status = 'running', last_resumed_at = now()
   WHERE user_id = auth.uid() AND status = 'paused';
  IF NOT FOUND THEN RAISE EXCEPTION 'no_paused_session'; END IF;
END $$;

-- Stops the open session. Sessions under 60 seconds are discarded as accidental clicks.
CREATE OR REPLACE FUNCTION public.study_stop(p_tz TEXT DEFAULT 'UTC')
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.study_sessions; _secs INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO s FROM public.study_sessions WHERE user_id = auth.uid() AND status <> 'completed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_open_session'; END IF;
  _secs := public._study_elapsed(s);
  IF _secs < 60 THEN
    DELETE FROM public.study_sessions WHERE id = s.id;
    RETURN 0;
  END IF;
  UPDATE public.study_sessions SET status = 'completed', accumulated_seconds = _secs, last_resumed_at = NULL, ended_at = now() WHERE id = s.id;
  PERFORM public._record_activity(auth.uid(), 'study', p_tz);
  RETURN _secs;
END $$;

REVOKE ALL ON FUNCTION public.study_current(), public.study_start(TEXT), public.study_pause(), public.study_resume(), public.study_stop(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_current(), public.study_start(TEXT), public.study_pause(), public.study_resume(), public.study_stop(TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.study_goals (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_minutes INT NOT NULL DEFAULT 60 CHECK (daily_minutes BETWEEN 5 AND 720),
  weekly_problems INT NOT NULL DEFAULT 5 CHECK (weekly_problems BETWEEN 1 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON public.study_goals;
CREATE POLICY "Users manage own goals" ON public.study_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  problem_id UUID REFERENCES public.coding_problems(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_items_user_due ON public.study_plan_items (user_id, due_date);
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own plan" ON public.study_plan_items;
CREATE POLICY "Users manage own plan" ON public.study_plan_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ======================== 6. AI USAGE AND CONTACT ========================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'hint', 'summary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage (user_id, created_at DESC);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own ai usage" ON public.ai_usage;
CREATE POLICY "Users read own ai usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages (created_at DESC);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read contact messages" ON public.contact_messages;
CREATE POLICY "Admins read contact messages" ON public.contact_messages FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update contact messages" ON public.contact_messages;
CREATE POLICY "Admins update contact messages" ON public.contact_messages FOR UPDATE USING (public.is_admin());
-- Inserts come only from the server (service role), which bypasses RLS.

-- ======================== 7. BADGE IDS ========================
UPDATE public.profiles SET badges = (
  SELECT COALESCE(jsonb_agg(DISTINCT
    CASE b WHEN 'ten_solver' THEN 'problems_10' WHEN 'fifty_solver' THEN 'problems_50' WHEN 'hundred_solver' THEN 'problems_100' ELSE b END), '[]'::jsonb)
  FROM jsonb_array_elements_text(badges) AS b
) WHERE badges ?| ARRAY['ten_solver', 'fifty_solver', 'hundred_solver'];

NOTIFY pgrst, 'reload schema';
