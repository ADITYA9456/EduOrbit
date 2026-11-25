-- Rollback for 005_security_hardening_2.sql. Run ONLY if 005 broke something and you accept that the
-- original security gaps (see SECURITY_AUDIT.md F-01 .. F-08) are open again. Review before running.
-- Data is preserved: answer keys are copied back, audit rows and answers are kept in their tables.

-- F-03: restore the public answer-key column from the private table, keep the private table.
UPDATE public.coding_problems cp SET correct_answer = a.correct_answer
  FROM public.problem_answers a WHERE a.problem_id = cp.id AND cp.correct_answer = '';

-- F-08
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_len;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_full_name_len;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_len;
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_text_len;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_text_len;

-- F-07 (the audit_log table and its rows are kept)
DROP TRIGGER IF EXISTS trg_audit_videos ON public.videos;
DROP TRIGGER IF EXISTS trg_audit_reports ON public.reports;
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
DROP TRIGGER IF EXISTS trg_audit_contests ON public.contests;

-- F-06
GRANT EXECUTE ON FUNCTION public._streak_for(UUID, DATE) TO PUBLIC;

-- F-02
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

-- F-04 / F-05
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP INDEX IF EXISTS public.uq_reports_video_reporter;

-- F-09
DROP POLICY IF EXISTS "Users read own profile; admins read all" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- F-01
DROP POLICY IF EXISTS "Approved videos are public; owners and admins see their own" ON public.videos;
DROP POLICY IF EXISTS "Signed-in users submit their own videos for review" ON public.videos;
CREATE POLICY "Approved videos are viewable by everyone" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit videos" ON public.videos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
