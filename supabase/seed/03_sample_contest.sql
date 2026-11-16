-- 03_sample_contest.sql
-- DEVELOPMENT SAMPLE. Run AFTER migrations 001 and 002 and AFTER 01_ and 02_ question seeds.
-- Creates one live contest so contests, registration, judging and standings can be tested immediately.
-- It contains no fake users and no fake scores: standings fill up only from real registrations
-- and real judged submissions. Safe to re-run (does nothing if the contest already exists).
-- Delete it later with:  DELETE FROM contests WHERE title = 'EDU Orbit Starter Contest (sample)';

INSERT INTO contests (title, description, start_time, end_time, status, wrong_penalty_minutes)
SELECT 'EDU Orbit Starter Contest (sample)',
       'A sample contest for testing. Four problems, scored by points with a 10 minute penalty for each wrong attempt before your first accepted solution. Rank ties are broken by total penalty, then by who finished first.',
       now() - interval '5 minutes',
       now() + interval '7 days',
       'active',
       10
WHERE NOT EXISTS (SELECT 1 FROM contests WHERE title = 'EDU Orbit Starter Contest (sample)');

INSERT INTO contest_problems (contest_id, problem_id, order_index, points)
SELECT c.id, p.id, v.ord, v.pts
FROM contests c
JOIN (VALUES
  ('two-sum-indices', 1, 100),
  ('valid-parentheses', 2, 100),
  ('maximum-subarray-sum', 3, 250),
  ('shortest-path-in-a-maze', 4, 400)
) AS v(slug, ord, pts) ON true
JOIN coding_problems p ON p.slug = v.slug
WHERE c.title = 'EDU Orbit Starter Contest (sample)'
ON CONFLICT (contest_id, problem_id) DO NOTHING;
