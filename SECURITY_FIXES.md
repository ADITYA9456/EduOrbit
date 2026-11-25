# Security fixes

Status key: FIXED AND VERIFIED, FIXED BUT NOT FULLY VERIFIED, REQUIRES MANUAL ACTION. "Verified" is explained for each item and detailed in `SECURITY_TEST_REPORT.md`. Finding IDs refer to `SECURITY_AUDIT.md`.

## Before you deploy: two steps, in this order

1. **Deploy the application code.** It works against the database both before and after migration 005 (it falls back to the old columns until the new tables exist).
2. **Apply `supabase/migrations/005_security_hardening_2.sql`** in the Supabase SQL editor after taking a backup (`docs/DEPLOYMENT.md` section 5). It is idempotent, non-destructive, and has a rollback: `supabase/rollbacks/005_security_hardening_2.rollback.sql`.

The only data change in 005: `coding_problems.correct_answer` is blanked after being copied into `problem_answers` (and only where the copy matches). It currently affects zero rows on your live project (no MCQ problems). Old duplicate reports, if any, are not deleted: the unique index is skipped with a notice until you remove them.

After applying 005, smoke-test: sign in, the leaderboard, a contest standings page, upload a video, the admin page (approve, ban, a contest edit), and open an MCQ if you have one. 005 was tested only in an in-memory Postgres, not on Supabase itself.

## Database (migration 005)

| ID | Change | Status |
|---|---|---|
| F-01 | `videos`: users may insert only `status='pending'`, `submitted_by = themselves`, `view_count = 0`, not banned. Reads: approved, own, or admin. All older INSERT and SELECT policies on the table are dropped first so a permissive leftover cannot re-open the hole | FIXED AND VERIFIED (PGlite: exploit reproduced before, blocked after; owners, admins, anon, normal submissions re-tested) |
| F-09 | `profiles`: SELECT limited to the owner and admins. Leaderboard and standings functions are SECURITY DEFINER and keep working | FIXED AND VERIFIED (PGlite) |
| F-02 | `user_progress`: client INSERT and UPDATE policies removed. SELECT of own rows stays. The server writes with the service role | FIXED AND VERIFIED (PGlite) |
| F-03 | New `problem_answers` table, admin-only RLS, no learner policy. Keys copied, public column blanked | FIXED AND VERIFIED (PGlite: key unreadable by anon and users, copied intact, re-run safe, rollback restores) |
| F-04 | `is_banned()` helper. Banned users cannot insert videos or reports | FIXED AND VERIFIED (PGlite) |
| F-05 | Unique index on `reports (video_id, reporter_id)`, length check on reason and description | FIXED AND VERIFIED (PGlite, including the "old duplicates present" path) |
| F-06 | `_streak_for` revoked from clients, granted to `service_role` | FIXED AND VERIFIED (PGlite). `my_streak` still works |
| F-07 | `admin_audit_log` table (admins read, nobody writes from a client) and triggers on `videos`, `reports`, `profiles` (ban, unban, role), `contests` that record admin actions made with an admin session | FIXED AND VERIFIED (PGlite: actor recorded, ordinary users and service role not logged as admin actions, history cannot be edited) |
| F-08 | Length limits on bio, name, username, video text, report text (`NOT VALID`: existing rows are not rewritten) | FIXED AND VERIFIED (PGlite) |

## Application code

| ID | Change | Files | Status |
|---|---|---|---|
| F-03 | Server grades MCQ answers and reads the key from `problem_answers` (falls back to the old column before 005). Client no longer checks correctness. Key stripped from `/api/daily-challenge`, `/api/questions/[slug]` and the problem page query | `api/progress`, `coding/[id]/page.js`, `api/daily-challenge`, `api/questions/[slug]` | FIXED AND VERIFIED for the public responses (built app probe). The authenticated MCQ round trip is NOT TESTED (no MCQ data and no test account) |
| F-02 | `/api/progress` writes with the service role, scoped to the caller, rate-limited, banned users refused | `api/progress/route.js` | FIXED BUT NOT FULLY VERIFIED (authenticated path not run) |
| F-01, C-06 | `/api/videos/submit`: validates id, title, category list, tags, thumbnail host, lengths; duplicate check with the service role; rate limit 10 per hour; banned users refused; no raw errors | `api/videos/submit/route.js` | FIXED BUT NOT FULLY VERIFIED (401 path and build verified; the authenticated path not run) |
| F-05 | `/api/videos/report`: UUID check, video must exist, counts with the service role so the 10-report auto-unpublish actually works, rate limit, banned refused | `api/videos/report/route.js` | FIXED BUT NOT FULLY VERIFIED |
| C-08 | `/api/videos/verify`: 6 s and 15 s timeouts, prompt data delimited and stripped of control characters, output clipped, persisted hourly Gemini cap (falls back to the mock verifier when exceeded), banned users refused. Providers unchanged | `api/videos/verify/route.js` | FIXED BUT NOT FULLY VERIFIED |
| C-03 | `/api/questions` POST, PUT, DELETE use `requireAdmin()` (checks `banned`), field allow-list with validation, answer keys written to `problem_answers`, audit log. List endpoint tolerates junk parameters | `api/questions/*`, `lib/question-input.js` | FIXED AND VERIFIED (unit tests for the allow-list, 401 probes) |
| C-05 | `/api/sync-leetcode`: constant-time secret comparison, shared admin gate, rate limit, no upstream body echo, audit entry | `api/sync-leetcode/route.js`, `lib/safe-equal.js` | FIXED AND VERIFIED (unit test, wrong-secret probe) |
| C-04, C-09 | Generic error messages, details logged server-side. `/api/bookmarks` validates ids | `api/bookmarks/route.js` and routes above | FIXED AND VERIFIED for the unauthenticated paths |
| F-07 | `logAdminAction()` helper. Admin problem create, update, delete and the legacy question routes write audit rows | `lib/audit.js`, `api/admin/problems/*` | FIXED BUT NOT FULLY VERIFIED (silently skipped until 005 is applied) |
| C-10 | `poweredByHeader:false`, `Cache-Control: no-store` on `/api/*`, `upgrade-insecure-requests` in production CSP, COOP `same-origin-allow-popups`, extra Permissions-Policy entries, `Secure` on the sign-out cookie clearing over HTTPS | `next.config.js`, `api/auth/signout` | FIXED AND VERIFIED (headers probed on the production build). The CSP allow-list itself was not narrowed, so Supabase, YouTube embeds and Monaco are unaffected |
| C-13 | Self-service data export (`GET /api/account/export`) and account deletion (`POST /api/account/delete`, needs `{confirm:"DELETE"}`, refuses admins, deletes contact messages and the auth user, which cascades). Profile page "Your data" section. Privacy page text updated. Signup notice linking Terms and Privacy | `api/account/*`, `profile/page.js`, `privacy/page.js`, `signup/page.js` | FIXED BUT NOT FULLY VERIFIED (401 verified; the full flows need a test account, NOT TESTED). Deleting an account is irreversible, so test with a throwaway account on a non-production project |
| C-01 (partial) | `npm audit fix` without `--force`: 14 advisories down to 4 (the remainder are Next.js, its bundled PostCSS and `@supabase/ssr`'s `cookie`) | `package-lock.json` | FIXED AND VERIFIED (build, lint and library tests pass after the update) |

## Tooling and automation

- `.github/workflows/ci-security.yml`: lint, library tests, SQL and RLS tests, build, dependency audit, and secret scanning (gitleaks). Uses no repository secrets and never deploys. **NOT TESTED**: it has never run on GitHub.
- `.github/workflows/codeql.yml`: CodeQL with the `security-extended` queries. NOT TESTED on GitHub.
- `.github/dependabot.yml`: weekly npm updates, major Next and React upgrades ignored (they need the planned migration).
- `scripts/test-sql.mjs`: syntax error fixed, two pre-existing ordering defects in its fixtures fixed, many new checks for migration 005 including pre-fix exploit reproductions (161 checks in total now).
- `scripts/test-lib.mjs`: 4 new checks. `scripts/test-api-security.mjs`: new black-box probe of a running build.

## Deliberately not changed

- Authentication provider, session handling, cookie options (managed by the Supabase library), existing CSP allow-list, the AI providers and mock mode, the schema's existing tables, the UI design system.
- The CSP still contains `'unsafe-inline'` for scripts. Removing it needs per-request nonces, which changes rendering of every page. See R-02.
- The Next.js major upgrade. See R-01.
