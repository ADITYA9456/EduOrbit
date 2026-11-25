# Deploying EduOrbit

## 1. Database (Supabase)
Existing project: run, in the SQL editor and in order, `supabase/migrations/001` to `005`, then the seed files in `supabase/seed/` (`01`, `02`, `04`, `05`, ...). Every file is safe to re-run.
New empty project only: run `supabase/database-schema.sql` first (it refuses to run if users exist), then the same files.
Migration 004 must be applied before the seeds, because the seeds write editorials to `problem_editorials`.
Migration 005 is the security hardening pass (see `SECURITY_FIXES.md`). Deploy the app code first, then run 005: the code works both before and after it. 005 moves MCQ answer keys to a private table (copied first, never deleted), closes direct client writes to `videos` status and `user_progress`, and stops anonymous reads of `profiles`. Rollback: `supabase/rollbacks/005_security_hardening_2.rollback.sql`. Take a backup first (section 5) and smoke-test sign-in, the leaderboard, a video upload and the admin page afterwards.
After a migration, the app cache refreshes itself (`NOTIFY pgrst`).
Give an account admin rights: `node scripts/make-admin.mjs you@example.com` (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`).
Auth settings: add your site URL and `<site>/api/auth/callback` under Authentication > URL Configuration (password reset and Google sign-in depend on it). Enable the Google provider for Google sign-in and an SMS provider for phone sign-in.

## 2. Environment variables (Vercel > Settings > Environment Variables)
See `.env.example`. Required: the three Supabase keys and `NEXT_PUBLIC_APP_URL` (this app's own public URL). Optional: `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER=gemini`, `JUDGE0_*`, `NEXT_PUBLIC_SECOND_APP_URL` (the Prep link; empty hides it).
The service role key and every key without `NEXT_PUBLIC_` stay server-side.

## 3. Code judge
Run, Submit and contests need a Judge0 CE instance (`JUDGE0_URL`). Self-host it on a Linux VPS (Judge0 needs cgroup v1) or use a hosted Judge0. Without it the UI says the judge is not configured. `scripts/dev-judge0-shim.js` is an unsandboxed local stand-in for development only. Never use it in production.

## 4. Deploy
Push the branch; Vercel builds with `npm run build`. Check `/api/judge/config`, sign up, sign in, password reset, one Run and one Submit after the first deploy.

## 5. Backups
Supabase Pro has daily backups and point-in-time recovery. On the free plan take a manual dump before every migration:
`pg_dump "<connection string from Project Settings > Database>" -Fc -f backup-YYYYMMDD.dump`
Restore with `pg_restore`. Keep the seeds and `scripts/questions/*` in git: problems and tests can be rebuilt from them.

## 6. Monitoring
Server errors are written to the Vercel function logs (`console.error`, kept in production). Browser errors reach the console with a digest that matches the server log line. Plug Sentry in later by wrapping `src/app/error.js` and `src/app/global-error.js` if you need alerting.

## 7. Rate limits
Per-user judge limits live in the database. Other limits (YouTube search, contact form, AI verification) are per serverless instance, so treat them as abuse dampers, not hard quotas. AI chat and hints are limited to 20 and 30 per user per hour through `ai_usage`.
