-- 002_contests_leaderboard.sql
-- Additive only. Run AFTER 001_judge_tables.sql.
-- Contest submissions, server-enforced contest window, and rank computation in Postgres.

ALTER TABLE contests ADD COLUMN IF NOT EXISTS wrong_penalty_minutes INTEGER NOT NULL DEFAULT 10;

-- ---------------------------------------------------------------------------
-- contest_submissions: one row per judged attempt made inside a contest.
-- Written only by the server after the judge returns a verdict.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contest_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id          UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id          UUID NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  judge_submission_id UUID REFERENCES judge_submissions(id) ON DELETE SET NULL,
  verdict             TEXT NOT NULL,
  is_accepted         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contest_subs_contest_user ON contest_submissions(contest_id, user_id, problem_id, created_at);

ALTER TABLE contest_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own contest submissions" ON contest_submissions;
CREATE POLICY "Users read own contest submissions" ON contest_submissions FOR SELECT USING (auth.uid() = user_id);

-- Hard server-side lock: even a service-role insert is rejected outside the window
-- or when the problem is not part of the contest or the user is not registered.
CREATE OR REPLACE FUNCTION public.enforce_contest_window()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  c RECORD;
BEGIN
  SELECT start_time, end_time INTO c FROM contests WHERE id = NEW.contest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'contest_not_found';
  END IF;
  IF now() < c.start_time THEN
    RAISE EXCEPTION 'contest_not_started';
  END IF;
  IF now() > c.end_time THEN
    RAISE EXCEPTION 'contest_ended';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM contest_problems WHERE contest_id = NEW.contest_id AND problem_id = NEW.problem_id) THEN
    RAISE EXCEPTION 'problem_not_in_contest';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM contest_participants WHERE contest_id = NEW.contest_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'not_registered';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contest_submissions_window ON contest_submissions;
CREATE TRIGGER trg_contest_submissions_window
  BEFORE INSERT ON contest_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contest_window();

-- Registration closes when the contest ends.
CREATE OR REPLACE FUNCTION public.enforce_registration_window()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF now() > (SELECT end_time FROM contests WHERE id = NEW.contest_id) THEN
    RAISE EXCEPTION 'contest_ended';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contest_participants_window ON contest_participants;
CREATE TRIGGER trg_contest_participants_window
  BEFORE INSERT ON contest_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_window();

-- ---------------------------------------------------------------------------
-- Contest ranking.
--   score   = sum of contest_problems.points for solved problems
--   penalty = for each solved problem: minutes from contest start to the first accepted
--             attempt + wrong_penalty_minutes per wrong attempt before it
--   order   = score DESC, penalty ASC, last accepted time ASC, user id (stable pagination)
-- Registered users with no solves are included at the bottom.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._contest_ranked(p_contest UUID)
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  score BIGINT, solved BIGINT, penalty_minutes NUMERIC, last_accepted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT id, start_time, end_time, wrong_penalty_minutes FROM contests WHERE id = p_contest
  ),
  subs AS (
    SELECT s.user_id, s.problem_id, s.is_accepted, s.created_at
    FROM contest_submissions s JOIN c ON c.id = s.contest_id
    WHERE s.created_at >= c.start_time AND s.created_at <= c.end_time
  ),
  first_ac AS (
    SELECT user_id, problem_id, MIN(created_at) AS ac_at FROM subs WHERE is_accepted GROUP BY user_id, problem_id
  ),
  wrongs AS (
    SELECT f.user_id, f.problem_id, COUNT(*) AS n
    FROM first_ac f
    JOIN subs s ON s.user_id = f.user_id AND s.problem_id = f.problem_id
               AND NOT s.is_accepted AND s.created_at < f.ac_at
    GROUP BY f.user_id, f.problem_id
  ),
  per_user AS (
    SELECT f.user_id,
           SUM(cp.points)::BIGINT AS score,
           COUNT(*)::BIGINT AS solved,
           SUM(EXTRACT(EPOCH FROM (f.ac_at - c.start_time)) / 60.0
               + COALESCE(w.n, 0) * c.wrong_penalty_minutes) AS penalty,
           MAX(f.ac_at) AS last_ac
    FROM first_ac f
    JOIN contest_problems cp ON cp.contest_id = p_contest AND cp.problem_id = f.problem_id
    CROSS JOIN c
    LEFT JOIN wrongs w ON w.user_id = f.user_id AND w.problem_id = f.problem_id
    GROUP BY f.user_id
  ),
  everyone AS (
    SELECT cpt.user_id, cpt.joined_at,
           COALESCE(pu.score, 0) AS score, COALESCE(pu.solved, 0) AS solved,
           COALESCE(pu.penalty, 0) AS penalty, pu.last_ac
    FROM contest_participants cpt
    LEFT JOIN per_user pu ON pu.user_id = cpt.user_id
    WHERE cpt.contest_id = p_contest
  )
  SELECT ROW_NUMBER() OVER (ORDER BY e.score DESC, e.penalty ASC, e.last_ac ASC NULLS LAST, e.joined_at ASC, e.user_id),
         e.user_id, p.username, p.full_name, p.avatar_url,
         e.score, e.solved, ROUND(e.penalty::NUMERIC, 1), e.last_ac
  FROM everyone e JOIN profiles p ON p.id = e.user_id
$$;

CREATE OR REPLACE FUNCTION public.contest_standings(p_contest UUID, p_limit INT DEFAULT 25, p_offset INT DEFAULT 0)
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  score BIGINT, solved BIGINT, penalty_minutes NUMERIC, last_accepted_at TIMESTAMPTZ,
  total_count BIGINT, is_me BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.rank, r.user_id, r.username, r.full_name, r.avatar_url, r.score, r.solved,
         r.penalty_minutes, r.last_accepted_at,
         COUNT(*) OVER () AS total_count, (r.user_id = auth.uid()) AS is_me
  FROM _contest_ranked(p_contest) r
  ORDER BY r.rank
  LIMIT LEAST(GREATEST(p_limit, 1), 100) OFFSET GREATEST(p_offset, 0)
$$;

-- The caller's own row, wherever it falls in the ranking.
CREATE OR REPLACE FUNCTION public.contest_my_standing(p_contest UUID)
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  score BIGINT, solved BIGINT, penalty_minutes NUMERIC, last_accepted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM _contest_ranked(p_contest) r WHERE r.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Global leaderboard from real accepted submissions.
--   points = sum of coding_problems.points over distinct problems solved
--   order  = points DESC, earliest time reaching that tally ASC, user id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._global_ranked()
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  points BIGINT, solved BIGINT, last_accepted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH first_ac AS (
    SELECT user_id, problem_id, MIN(created_at) AS ac_at
    FROM judge_submissions
    WHERE kind = 'submit' AND verdict = 'accepted'
    GROUP BY user_id, problem_id
  ),
  scored AS (
    SELECT f.user_id, SUM(cp.points)::BIGINT AS points, COUNT(*)::BIGINT AS solved, MAX(f.ac_at) AS last_ac
    FROM first_ac f JOIN coding_problems cp ON cp.id = f.problem_id
    GROUP BY f.user_id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY s.points DESC, s.last_ac ASC, s.user_id),
         s.user_id, p.username, p.full_name, p.avatar_url, s.points, s.solved, s.last_ac
  FROM scored s JOIN profiles p ON p.id = s.user_id
  WHERE COALESCE(p.banned, false) = false
$$;

CREATE OR REPLACE FUNCTION public.global_leaderboard(p_limit INT DEFAULT 25, p_offset INT DEFAULT 0)
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  points BIGINT, solved BIGINT, last_accepted_at TIMESTAMPTZ, total_count BIGINT, is_me BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.rank, r.user_id, r.username, r.full_name, r.avatar_url, r.points, r.solved,
         r.last_accepted_at, COUNT(*) OVER () AS total_count, (r.user_id = auth.uid()) AS is_me
  FROM _global_ranked() r
  ORDER BY r.rank
  LIMIT LEAST(GREATEST(p_limit, 1), 100) OFFSET GREATEST(p_offset, 0)
$$;

CREATE OR REPLACE FUNCTION public.global_my_rank()
RETURNS TABLE (
  rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT,
  points BIGINT, solved BIGINT, last_accepted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM _global_ranked() r WHERE r.user_id = auth.uid()
$$;

-- Internal helpers are not callable from the API; the paged wrappers are.
REVOKE ALL ON FUNCTION public._contest_ranked(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._global_ranked() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contest_standings(UUID, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contest_my_standing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_leaderboard(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.global_my_rank() TO authenticated;

NOTIFY pgrst, 'reload schema';
