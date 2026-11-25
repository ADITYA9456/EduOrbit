# EduOrbit security audit

Date: 25 November 2026. Scope: this repository (main EduOrbit). Method: reading the source, reading every SQL migration, running the app's own SQL in an in-memory Postgres (PGlite) as different roles, read-only probes of the live Supabase project with the public anon key, a production build, and black-box probes of that build. This is an engineering review, not a certification. Nothing here means the application is "100% secure".

Companion files: `SECURITY_FIXES.md` (what changed), `SECURITY_REMAINING_RISKS.md` (what still needs a human), `SECURITY_TEST_REPORT.md` (evidence and limits), `PRIVACY_COMPLIANCE_CHECKLIST.md`, `SECURITY_INCIDENT_RESPONSE.md`, `SECURITY.md`.

## 1. Architecture discovered

| Area | What the repository actually contains |
|---|---|
| Framework | Next.js 14.2.35 (App Router), React 18, plain JavaScript, Tailwind + a custom CSS design system, PWA via Serwist |
| Hosting | Built for Vercel (`docs/DEPLOYMENT.md`). No `vercel.json`, no CI before this audit |
| Auth | Supabase Auth through `@supabase/ssr`: email + password, Google OAuth, phone OTP, password reset. Session refreshed in `src/middleware.js`. Cookies are managed by the Supabase library |
| Authorization | `profiles.role` (`user`, `admin`, `moderator`). Admin API routes call `requireAdmin()` (server, service role lookup, checks `banned`). The `/admin` page also checks the role in the browser, but its data access is enforced by row-level security (RLS) |
| Database | Supabase Postgres. Schema in `supabase/database-schema.sql`, migrations `000` to `004` (and now `005`). RLS enabled on every table. SECURITY DEFINER functions with `search_path` pinned |
| Server writes | A service-role client (`createServerSupabase().supabaseAdmin`) used by judge, admin, AI and contact routes |
| Code execution | Judge0 CE, called server-side only (`src/lib/judge/*`). `enable_network:false`, CPU, wall and memory limits per run, 64 KB code cap, per-user DB-backed rate limit. Self-host recipe in `judge0/` |
| AI | Gemini through `src/lib/gemini.js` (study assistant, hints) and the video verifier. `AI_PROVIDER=mock` is the default. Per-user hourly quota in `ai_usage` |
| Third parties | YouTube (oEmbed, Data API, iframe), Piped and Invidious public mirrors as search fallback, LeetCode GraphQL (admin-triggered sync), Google Fonts via `next/font`, jsDelivr (Monaco) |
| Storage / uploads | None. Users submit YouTube links, not files. No storage buckets. File-upload checks are NOT APPLICABLE |
| Payments | None. Payment checks are NOT APPLICABLE |
| Exams (GATE etc.) | None in this repo. There are MCQ-type coding problems and timed contests |
| Tests before audit | `scripts/test-lib.mjs`, `test-sql.mjs`, `test-judge.mjs`, `test-editor-ui.mjs`. No CI |

## 2. Security inventory

Status key: 1 present and secure, 2 present, needs improvement, 3 present and vulnerable, 4 missing but required, 5 not applicable, 6 needs external configuration.

| Component | Status | Notes |
|---|---|---|
| Sessions, `getUser()` on the server for every API route | 1 | Uses `auth.getUser()` (validated with Supabase), not the unverified cookie |
| Route protection (middleware) | 1 | Guests redirected from `/profile /upload /admin /dashboard` (verified) |
| Open-redirect handling | 1 | `safeRedirectPath` (unit tested); callback ignores off-site `next` |
| Password storage | 1 | Delegated to Supabase Auth (hashed). Nothing stored locally |
| Security headers and CSP | 2 | Good baseline existed. CSP still allows `'unsafe-inline'` scripts (Next.js inline bootstrap). Improved, see fixes |
| Judge hidden tests | 1 | `problem_tests` has no policy for hidden rows. Verified 0 hidden rows readable by anon on the live project |
| Judge verdict and scoring integrity | 1 | Verdicts written only by the server. Leaderboard computed from `judge_submissions` in SQL |
| Contest window | 1 | Enforced by a DB trigger as well as the route |
| Editorial hiding during live contests | 1 | RLS on `problem_editorials` |
| Profile privileged columns | 1 | `protect_profile_columns` trigger blocks role, ban, points edits by users |
| `videos` RLS | 3 | F-01 |
| `profiles` RLS | 3 | F-09 |
| MCQ answer keys | 3 | F-03 (latent: no MCQ rows currently exist in the live project) |
| `user_progress` RLS | 2 | F-02 |
| Admin audit trail | 4 | F-07 (admin actions were not recorded anywhere) |
| Error handling in API routes | 2 | Several routes returned raw database errors |
| Dependencies | 3 | C-01 |
| Rate limiting | 2 | Judge and AI are DB-backed. Others are per-instance memory (R-03) |
| Judge0 infrastructure | 6 | Not reachable from here. R-06 |
| Supabase dashboard auth settings | 6 | Not inspectable from code. R-04 |
| Secrets in git | 1 | `.env.local` is ignored and was never committed. History scan found no keys |
| Logging / monitoring / incident process | 4 | No error tracking, no documented process. Added `SECURITY_INCIDENT_RESPONSE.md` |
| File upload, storage, payments, GATE exam engine | 5 | Do not exist in this repository. Nothing was added |

## 3. Findings

Severity follows the scale in the brief. "Verified" means a test I ran shows the weakness before and its absence after. "Live probe" means a read-only request with the public anon key against the real Supabase project. Fixes to the database exist as migration `005` and are **not applied to your live project until you run it**.

### Medium

**F-01 Users can publish videos without moderation.** `supabase/database-schema.sql:343-345`. The INSERT policy only required `auth.role() = 'authenticated'`, so a signed-in user could call the public REST API with `status:'approved'` and `submitted_by` of their choice. The SELECT policy was `USING (true)`, so every pending and rejected video was readable by everyone. Reproduce: PGlite test `PRE-005 F-01 CONFIRMED`. Impact: bypass of the admin approval workflow, readable moderation queue. Fix: migration 005 (owner-only pending inserts, approved-or-own-or-admin reads), server validation in `/api/videos/submit`. Status: FIXED AND VERIFIED in PGlite, **REQUIRES MANUAL ACTION to apply 005**.

**F-03 MCQ answer keys readable by anyone.** `coding_problems.correct_answer` is selected by the problem page in the browser and returned by `/api/questions/[slug]` and `/api/daily-challenge` (`select('*')`). The browser also decided correctness. Reproduce: `PRE-005 F-03 CONFIRMED`. Live probe: 18 problems, 0 of type `mcq`, so no key is exposed today. It becomes exposed the day an MCQ is added. Impact: answer-key disclosure and client-side score manipulation for any MCQ. Fix: keys move to `problem_answers` (admin and server only), the server grades in `/api/progress`, public responses strip the field. Status: FIXED AND VERIFIED (PGlite and built-app probe), REQUIRES MANUAL ACTION to apply 005.

**F-09 Profiles readable by anonymous visitors.** Policy `Profiles are viewable by everyone USING (true)`. Live probe: 4 profiles returned to an unauthenticated request, with the single admin identifiable by `role`. Also exposed: ban flag, timezone, streak dates, bio. Phone numbers were already blanked by migration 004. Leaderboards use SECURITY DEFINER functions, so they do not need this policy. Fix: owner and admin only. Status: FIXED AND VERIFIED in PGlite (leaderboard and standings re-tested), REQUIRES MANUAL ACTION to apply 005.

### High (conditional)

**C-01 Next.js 14.2.35 has published advisories, including critical ones.** `npm audit` lists critical remote-code-execution advisories for the Image Optimization API (AVIF and SVG) and Windows hosts, and several high denial-of-service advisories. The listed fixes are in 15.5.x and 16.x. Exploitability here is unverified: this project does not enable AVIF or SVG optimisation (defaults), and Vercel's Linux runtime is the documented target. It is still a framework that is behind its security releases. Status: NOT FIXED, REQUIRES MANUAL ACTION (planned major upgrade, see R-01). Non-major dependency advisories were fixed (14 findings down to 4).

### Low

| ID | Finding | Location | Status |
|---|---|---|---|
| F-02 | Users could write their own `user_progress` rows (e.g. `attempted` with a score). A `solved` row was blocked only by accident, by the profile-protection trigger. Does not affect rankings (computed from `judge_submissions`) | policies in `database-schema.sql:393-394` | FIXED AND VERIFIED (PGlite), apply 005 |
| F-04 | Banned users could still insert videos and reports through the public API | RLS | FIXED AND VERIFIED (PGlite), apply 005 |
| F-05 | Duplicate-report rule existed only in the route. Also the auto-unpublish counter counted with the reporter's own session, which only sees their own reports, so the 10-report threshold could never fire | `api/videos/report/route.js` (old lines 47-58) | FIXED (route verified by build and review, DB part verified in PGlite) |
| F-06 | `_streak_for(uuid, date)` callable by anyone for any user id. Live probe returned 200 | `004_platform_features.sql:92` | FIXED AND VERIFIED (PGlite), apply 005 |
| F-07 | Privileged actions had no audit trail: video approval, report resolution, bans, contest edits (made with the admin's own browser session), and server admin routes | n/a | FIXED AND VERIFIED (PGlite triggers). Server routes write rows once 005 is applied |
| F-08 | No length limits on user text (bio, name, video fields, report text) | tables | FIXED, `NOT VALID` so existing rows are untouched |
| C-03 | `PUT /api/questions/[slug]` passed the request body straight to `update()` (mass assignment, admin only). Admin gate did not check `banned` | `api/questions/[slug]/route.js` | FIXED AND VERIFIED (unit tests for the allow-list) |
| C-04 | Raw `error.message` and `err.message` returned to clients in many routes | `api/questions`, `bookmarks`, `videos/*`, `sync-leetcode` | FIXED (generic messages, details to server logs) |
| C-05 | `/api/sync-leetcode`: shared secret compared with `===`, upstream response body echoed back (`raw`), no rate limit | `api/sync-leetcode/route.js` | FIXED AND VERIFIED (wrong-secret probe, unit test for `safeEqual`) |
| C-06 | `/api/videos/submit` stored client-supplied category, thumbnail URL, tags and lengths unchecked | `api/videos/submit/route.js` | FIXED |
| C-08 | `/api/videos/verify`: no timeouts on outbound calls, untrusted video text placed straight into the Gemini prompt, no persisted cost cap, banned users allowed | `api/videos/verify/route.js` | FIXED (delimited prompt, caps, timeout, quota `summary`). The AI verdict is advisory only, an admin still approves |
| C-09 | `/api/bookmarks` accepted any `questionId` string | `api/bookmarks/route.js` | FIXED |

### Informational

- C-10: API responses had no `Cache-Control: no-store`, and `X-Powered-By` was sent. Fixed.
- C-13: No self-service data export or account deletion (a privacy-rights gap, see `PRIVACY_COMPLIANCE_CHECKLIST.md`). Added `/api/account/export` and `/api/account/delete` and a section on the profile page.
- C-14: The repository's own SQL test script had a syntax error and five failing checks (test-data ordering), so it could not run. Fixed in the script only. No product code was involved.
- Secrets: `.env.local` is git-ignored and was never in history. A pattern scan of tracked files found no keys. Real keys do exist in the local `.env.local` (Supabase service role, YouTube, Gemini). They are not in the repository, I did not print them, and I did not rotate anything. If that file has ever been shared or zipped (SETUP.md discusses moving the project between computers), rotate those keys.
- Positive findings worth keeping: service-role key is server-only and not `NEXT_PUBLIC_`; judge hidden tests and verdict writes are protected; contest timing is enforced in the database; SECURITY DEFINER functions pin `search_path`; internal helpers are revoked from clients; `dangerouslySetInnerHTML` is used once, for a constant theme script.

## 4. Live-project probe results (read-only, anon key)

Readable by an anonymous visitor: `profiles` (4 rows, F-09), `coding_problems` (18, no answer keys or legacy tests), `problem_editorials` (1, allowed outside live contests), `problem_tests` (sample rows only, 0 hidden). Empty or not readable: `contact_messages`, `ai_verification_logs`, `reports`, `judge_submissions`, `ai_usage`, `submissions`, `study_sessions`. `_global_ranked` and `_record_activity` returned `permission denied` (good). `_streak_for` returned data (F-06). No write was attempted against the live project.

## 5. What was not assessed

Live Supabase dashboard settings, the Judge0 server, Vercel project settings, DNS and TLS, the production deployment's environment variables, anything behind a login (no test accounts were created on your live project). See `SECURITY_REMAINING_RISKS.md`.
