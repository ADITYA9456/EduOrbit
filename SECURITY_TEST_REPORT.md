# Security test report

Date: 25 November 2026. Machine: Windows, Node v26.13.1, npm 11.20.0. No test created accounts or wrote data on your live Supabase project. Live-project interaction was limited to read-only requests with the public anon key (see `SECURITY_AUDIT.md` section 4).

## Results

| # | Test | How to run | Result |
|---|---|---|---|
| 1 | SQL, migrations, RLS and role tests in an in-memory Postgres (PGlite, with stand-ins for Supabase roles and `auth.uid()`) | `PGLITE_DIR=<dir with @electric-sql/pglite> node scripts/test-sql.mjs` | **161 PASS, 0 FAIL** after the changes |
| 2 | Library unit tests (redirect safety, rate limiter, insights, new `safeEqual` and question allow-list) | `node scripts/test-lib.mjs` | **All pass** |
| 3 | Lint | `npm run lint` | **Pass**, 0 errors (existing `<img>` warnings only) |
| 4 | Production build | `npm run build` | **Pass**, before and after `npm audit fix` |
| 5 | Black-box probe of the built app (headers, 401s, redirects, public-response contents, off-site redirects, contact validation) | `npx next start -p 3100` then `BASE_URL=http://localhost:3100 node scripts/test-api-security.mjs` | **48 of 48 PASS** |
| 6 | Dependency audit | `npm audit --omit=dev` | 14 findings (1 critical, 7 high) before, **4** after (1 critical and 1 high from Next.js and its PostCSS, 2 low). The rest need a major upgrade, see R-01 |
| 7 | Secret scan of tracked files and git history for env files and common key patterns | `git grep`, `git log -- .env*` | No secrets found in tracked files or history |

### What test 1 proves

For each database finding the suite first reproduces the weakness on the pre-005 database (the lines named `PRE-005 ... CONFIRMED` pass only if the hole exists), then applies migration 005 and shows it closed. It also checks: owners, admins and anonymous visitors still see the right videos; leaderboards and contest standings still list other users after `profiles` is locked down; `my_streak` still works; normal submissions still work; banned users are blocked; the audit log records an admin's actions and not a normal user's or the service role's; users cannot read, write or rewrite the audit log; 005 runs three times without error and also when old duplicate reports exist; the rollback script runs, restores the old behaviour and keeps data; re-applying 005 after rollback closes the holes again. Earlier protections are re-tested after 005: users still cannot edit their own role, non-admins cannot edit problems, hidden judge tests stay unreadable.

Starting state: the script did not run at all (a syntax error on line 35), and five checks failed once that was fixed because the fixtures did not account for the seeds writing editorials before migration 004 moved them, and a still-live fixture contest. I corrected those in the script (test code only). The baseline then passed 100%.

### Live read-only probe (anon key)

Confirmed F-09 (profiles readable) and F-06 (`_streak_for` callable). Confirmed protected: hidden tests, contact messages, reports, AI logs, judge submissions, ai_usage, study sessions, `_global_ranked`, `_record_activity`.

## NOT TESTED, and why

| Item | Why not |
|---|---|
| Login, registration, Google OAuth, phone OTP, password reset | Need real accounts and provider configuration. I did not create users on your live project |
| Everything behind a login: `/api/progress`, `/api/videos/*` happy paths, bookmarks, AI chat and hints, dashboard, account export, account deletion, admin panel actions | Same reason. The unauthenticated side (401) is tested. The authenticated code was reviewed and builds, but did not run |
| Migration 005 on a real Supabase project | Only PGlite was available. See R-12 |
| Code execution (Run, Submit, contests end to end) | No Judge0 instance is configured here. `scripts/test-judge.mjs` and `test-editor-ui.mjs` were not run |
| Real MCQ grading round trip | The live project has no MCQ problems |
| Visual check of the new profile "Your data" section and the signup notice | Not opened in a browser |
| GitHub Actions workflows, gitleaks, CodeQL, Dependabot | They have never run, they only exist in the repository |
| XSS, CSRF and injection fuzzing, ZAP, load tests, CSP in a real browser against OAuth, YouTube embeds and Monaco | Not run. The CSP allow-list was not narrowed, only added to (`upgrade-insecure-requests`), but only the server headers were checked |
| Supabase dashboard settings, Judge0 server, Vercel settings, DNS and TLS | Outside the repository |

## Known limits of this evidence

PGlite is Postgres but not Supabase: no PostgREST, no GoTrue, simplified roles. The black-box probe tests one instance with an empty cache, so it says nothing about distributed rate limits. The `callback` open-redirect probe used an invalid code, so the redirect target branch is covered by the `safeRedirectPath` unit tests rather than by the probe.
