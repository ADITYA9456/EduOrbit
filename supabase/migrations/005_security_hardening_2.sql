-- 005_security_hardening_2.sql
-- Run AFTER 001 .. 004 (paste into the Supabase SQL editor). Safe to run more than once.
-- Rollback: supabase/rollbacks/005_security_hardening_2.rollback.sql
--
-- What it changes, and why (see SECURITY_AUDIT.md for the findings):
--   F-01  videos: any signed-in user could INSERT a video with status 'approved' straight through the
--         public API and skip moderation, and every pending/rejected video was readable by everyone.
--   F-02  user_progress: users could write their own progress rows (status/score). Progress is now
--         written only by the server.
--   F-03  MCQ answer keys were readable by everyone (coding_problems.correct_answer). They move to
--         problem_answers, which only admins and the server can read. The text is COPIED first.
--   F-04  banned users could still write through the public API (videos, reports). Enforced in RLS.
--   F-05  reports: one report per user per video is now enforced by the database; length limits.
--   F-06  _streak_for() could be called by anyone for any user id. Now server-internal only.
--   F-07  Admin actions made through the browser session (approve/reject video, resolve report, ban,
--         contests) were not recorded. An admin_audit_log table and triggers now record them.
--   F-08  Length limits on user-written text (NOT VALID: existing rows are not touched).
--   F-09  profiles were readable by anonymous visitors (role, ban flag, timezone, bio). Now owner + admin.
-- Nothing is dropped or deleted. The only data change is blanking coding_problems.correct_answer
-- AFTER it has been copied into problem_answers.

-- ======================== helpers ========================
CREATE OR REPLACE FUNCTION public.is_banned()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT banned FROM public.profiles WHERE id = auth.uid()), false)
$$;
GRANT EXECUTE ON FUNCTION public.is_banned() TO anon, authenticated;

-- ======================== F-01 / F-04: videos ========================
-- Drop every existing INSERT/SELECT policy on videos (the permissive ones from database-schema.sql
-- are OR-ed together with new ones, so leaving them would keep the hole open), then recreate.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'videos' AND cmd IN ('INSERT', 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.videos', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Approved videos are public; owners and admins see their own" ON public.videos
  FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR public.is_admin());

CREATE POLICY "Signed-in users submit their own videos for review" ON public.videos
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND status = 'pending'
    AND COALESCE(view_count, 0) = 0
    AND NOT public.is_banned()
  );

-- ======================== F-09: profiles are no longer world-readable ========================
-- The public "viewable by everyone" policy exposed every user's role (so admins were identifiable), ban
-- flag, timezone, streak dates and bio to anonymous visitors. The app reads other people's names only
-- through the SECURITY DEFINER leaderboard/standings functions, which are unaffected by this policy.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users read own profile; admins read all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- ======================== F-04 / F-05: reports ========================
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND NOT public.is_banned());

-- One report per user per video. Skipped (with a notice) if old duplicates exist; nothing is deleted.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_video_reporter ON public.reports (video_id, reporter_id);
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'uq_reports_video_reporter not created: duplicate reports already exist. Remove duplicates, then re-run.';
END $$;

-- ======================== F-02: user_progress is server-written ========================
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
-- "Users can view own progress" (SELECT) stays. The service role bypasses RLS and does the writes.

-- ======================== F-03: MCQ answer keys ========================
CREATE TABLE IF NOT EXISTS public.problem_answers (
  problem_id     UUID PRIMARY KEY REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  correct_answer TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.problem_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage problem answers" ON public.problem_answers;
CREATE POLICY "Admins manage problem answers" ON public.problem_answers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No other policy: learners can never read an answer key. The server reads it with the service role.

INSERT INTO public.problem_answers (problem_id, correct_answer)
SELECT id, correct_answer FROM public.coding_problems
 WHERE correct_answer IS NOT NULL AND correct_answer <> ''
ON CONFLICT (problem_id) DO NOTHING;

-- Blank the public copy only where the private copy now holds the same text.
UPDATE public.coding_problems cp SET correct_answer = ''
 WHERE cp.correct_answer <> ''
   AND EXISTS (SELECT 1 FROM public.problem_answers a WHERE a.problem_id = cp.id AND a.correct_answer = cp.correct_answer);

-- ======================== F-06: internal helper no longer public ========================
REVOKE ALL ON FUNCTION public._streak_for(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._streak_for(UUID, DATE) TO service_role;

-- ======================== F-07: admin audit log ========================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT USING (public.is_admin());
-- No INSERT/UPDATE/DELETE policy: only the triggers below and the server (service role) write here.

-- Records privileged changes made with an admin's own session. Server-side admin routes that use the
-- service role (auth.uid() is NULL) write their own rows instead.
CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_old JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_row JSONB := COALESCE(v_new, v_old);
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin() THEN RETURN NULL; END IF;

  IF TG_TABLE_NAME = 'videos' THEN
    IF v_new->>'status' IS DISTINCT FROM v_old->>'status' THEN
      INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
      VALUES (v_actor, 'video.status', 'video', v_row->>'id', jsonb_build_object('from', v_old->>'status', 'to', v_new->>'status'));
    END IF;
  ELSIF TG_TABLE_NAME = 'reports' THEN
    IF v_new->>'status' IS DISTINCT FROM v_old->>'status' THEN
      INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
      VALUES (v_actor, 'report.status', 'report', v_row->>'id', jsonb_build_object('from', v_old->>'status', 'to', v_new->>'status'));
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF v_new->>'banned' IS DISTINCT FROM v_old->>'banned' THEN
      INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
      VALUES (v_actor, CASE WHEN (v_new->>'banned')::boolean THEN 'user.ban' ELSE 'user.unban' END, 'user', v_row->>'id', '{}'::jsonb);
    END IF;
    IF v_new->>'role' IS DISTINCT FROM v_old->>'role' THEN
      INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
      VALUES (v_actor, 'user.role', 'user', v_row->>'id', jsonb_build_object('from', v_old->>'role', 'to', v_new->>'role'));
    END IF;
  ELSIF TG_TABLE_NAME = 'contests' THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
    VALUES (v_actor, 'contest.' || lower(TG_OP), 'contest', v_row->>'id', jsonb_build_object('title', v_row->>'title'));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_videos ON public.videos;
CREATE TRIGGER trg_audit_videos AFTER UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
DROP TRIGGER IF EXISTS trg_audit_reports ON public.reports;
CREATE TRIGGER trg_audit_reports AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
DROP TRIGGER IF EXISTS trg_audit_contests ON public.contests;
CREATE TRIGGER trg_audit_contests AFTER INSERT OR UPDATE OR DELETE ON public.contests FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

-- ======================== F-08: length limits (new and edited rows only) ========================
DO $$
BEGIN
  BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_len CHECK (char_length(bio) <= 500) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_full_name_len CHECK (char_length(full_name) <= 100) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_len CHECK (char_length(username) <= 40) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TABLE public.videos ADD CONSTRAINT videos_text_len CHECK (
    char_length(title) <= 200 AND char_length(description) <= 5000 AND char_length(channel_title) <= 200
    AND COALESCE(array_length(tags, 1), 0) <= 30) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TABLE public.reports ADD CONSTRAINT reports_text_len CHECK (
    char_length(reason) <= 100 AND char_length(description) <= 1000) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
