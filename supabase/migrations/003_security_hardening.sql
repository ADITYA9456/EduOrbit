-- 003_security_hardening.sql
-- RECOMMENDED. Run AFTER 001 and 002. Read before running: it REPLACES open policies.
--
-- database-schema.sql created several policies named "Service role can ..." with USING (true).
-- A policy without "TO service_role" applies to every role, so anyone holding the public anon
-- key could edit problems, contests, leaderboard rows, videos, reports and AI logs.
-- (The real service role bypasses RLS and never needed those policies.)
-- This file replaces them with admin-only policies. It also stops users from editing their own
-- role, ban flag, points, solved count and badges.
--
-- The /admin page writes with the signed-in admin's browser session, so admin policies are
-- added here to keep it working. If your admin user's profiles.role is not 'admin', fix that first.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- coding_problems
DROP POLICY IF EXISTS "Service role can manage problems" ON coding_problems;
DROP POLICY IF EXISTS "Admins manage problems" ON coding_problems;
CREATE POLICY "Admins manage problems" ON coding_problems FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- contests
DROP POLICY IF EXISTS "Service role can manage contests" ON contests;
DROP POLICY IF EXISTS "Admins manage contests" ON contests;
CREATE POLICY "Admins manage contests" ON contests FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- legacy per-contest leaderboard (the new ranking is computed from contest_submissions)
DROP POLICY IF EXISTS "Service role can manage leaderboard" ON leaderboard_entries;

-- daily challenges
DROP POLICY IF EXISTS "Service role can manage daily challenges" ON daily_challenges;
DROP POLICY IF EXISTS "Admins manage daily challenges" ON daily_challenges;
CREATE POLICY "Admins manage daily challenges" ON daily_challenges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- videos
DROP POLICY IF EXISTS "Service role can update videos" ON videos;
DROP POLICY IF EXISTS "Admins update videos" ON videos;
CREATE POLICY "Admins update videos" ON videos FOR UPDATE USING (public.is_admin());

-- reports
DROP POLICY IF EXISTS "Service role can manage reports" ON reports;
DROP POLICY IF EXISTS "Service role can update reports" ON reports;
DROP POLICY IF EXISTS "Admins read reports" ON reports;
CREATE POLICY "Admins read reports" ON reports FOR SELECT USING (public.is_admin() OR auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admins update reports" ON reports;
CREATE POLICY "Admins update reports" ON reports FOR UPDATE USING (public.is_admin());

-- AI verification logs
DROP POLICY IF EXISTS "Service role can manage ai logs" ON ai_verification_logs;
DROP POLICY IF EXISTS "Admins manage ai logs" ON ai_verification_logs;
CREATE POLICY "Admins manage ai logs" ON ai_verification_logs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- legacy submissions: verdicts are now written only by the server
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;

-- profiles: admins may update anyone (admin page); users may not change privileged columns
DROP POLICY IF EXISTS "Admins update profiles" ON profiles;
CREATE POLICY "Admins update profiles" ON profiles FOR UPDATE USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() is NULL for the service role and for SQL-editor sessions: allowed.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role            IS DISTINCT FROM OLD.role
  OR NEW.banned          IS DISTINCT FROM OLD.banned
  OR NEW.total_points    IS DISTINCT FROM OLD.total_points
  OR NEW.problems_solved IS DISTINCT FROM OLD.problems_solved
  OR NEW.badges          IS DISTINCT FROM OLD.badges THEN
    RAISE EXCEPTION 'protected_profile_column';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

NOTIFY pgrst, 'reload schema';
