# Remaining security risks and required manual actions

Everything here is either outside what source code can safely change, needs credentials or infrastructure I do not have, or is a decision for you. Items are ordered by priority. None of these has been done.

## Do these first

| # | Action | Why | Status |
|---|---|---|---|
| M-1 | Back up Supabase, then run `supabase/migrations/005_security_hardening_2.sql` (after deploying the new code) | Closes F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09. Until you run it the live database is still open on those points (F-09 and F-06 were confirmed live) | REQUIRES MANUAL ACTION |
| M-2 | Create a throwaway account on a non-production Supabase project and walk through the flows listed as NOT TESTED in `SECURITY_TEST_REPORT.md` before relying on 005 and the new account routes | Authenticated paths and the real PostgREST stack were not exercised | REQUIRES MANUAL ACTION |
| M-3 | If `.env.local` has ever left your machine (zip, chat, USB, another computer), rotate: Supabase service role key, YouTube API key, Gemini API key. Never put them in the repo | They exist in plain text locally. I found no sign they were committed and I did not rotate anything | REQUIRES MANUAL ACTION |
| M-4 | Plan the Next.js upgrade (R-01) | Framework is behind security releases | REQUIRES MANUAL ACTION |

## Risks

**R-01 Next.js 14.2.35 (High, conditional).** Remaining `npm audit` items: Next.js (critical and high advisories: image optimizer RCE for AVIF and SVG, Windows hosts, several DoS), the PostCSS copy bundled by Next, and `cookie` inside `@supabase/ssr` (low). Fixes exist only in Next 15.5.x and 16.x (major) and `@supabase/ssr` 0.12 (breaking). Suggested plan: a separate branch, upgrade to the newest 15.5.x (smallest jump that carries the fixes), re-run `scripts/test-*.mjs`, the judge flow, OAuth callback, PWA service worker and CSP, then deploy a preview before production. Meanwhile do not enable AVIF or SVG image optimisation, keep deploying on Vercel (Linux), and keep `images.remotePatterns` as narrow as it is. NOT FIXED.

**R-02 CSP allows `'unsafe-inline'` scripts (Low).** Needed by Next.js inline bootstrap and the theme script. A nonce-based CSP means dynamic rendering for every page and a middleware change. Frame, object, base-uri and form-action are already locked down, so the practical XSS exposure is limited: React escapes user text, there is no `dangerouslySetInnerHTML` with user data, and external scripts are restricted to `'self'` and jsDelivr. NOT FIXED, acceptable for now.

**R-03 Most rate limits are per serverless instance (Medium).** Judge and AI limits are DB-backed and hold globally. YouTube search, contact form, video verify, video submit, report, progress, account export and delete, sync-leetcode use in-memory counters, so an attacker spread across instances gets more than the stated limit. Login, signup, OTP and password-reset brute force are limited by Supabase Auth itself, not by this app. Action: configure rate limits and CAPTCHA (Turnstile or hCaptcha) in Supabase Auth settings, and consider a shared store (Vercel KV, Upstash) for the in-memory limiters. REQUIRES MANUAL ACTION.

**R-04 Supabase Auth dashboard settings (not inspectable from code).** Please check and record: email confirmation required; minimum password length and "leaked password protection" (the signup form enforces 8 characters only in the browser); OTP expiry and SMS rate limits (SMS pumping and cost abuse is a real risk for phone OTP); allowed redirect URLs limited to your domains; JWT expiry and refresh-token rotation; whether MFA is offered (recommended at least for admin accounts); session timebox. REQUIRES MANUAL ACTION.

**R-05 Account enumeration (Low).** Signup tells the user "an account with this email already exists", which reveals registered emails. This is a usability choice. To remove it, show a neutral "check your email" message and let Supabase's confirmation email handle the duplicate case. Not changed because it alters the sign-up experience. NOT FIXED, decision for you.

**R-06 Judge0 infrastructure (High if misconfigured; not assessed).** The app side is sound: server-only calls, `enable_network:false`, per-test CPU, wall and memory caps, 64 KB source limit, per-user DB rate limit, hidden tests never returned. The runtime is outside this repository. Check on the server: Judge0 listening only on localhost behind an HTTPS reverse proxy, `AUTHN_TOKEN` set and long, firewall allowing only your Vercel egress or the proxy, `ENABLE_NETWORK=false` and `ALLOW_ENABLE_NETWORK=false` kept in `judge0.conf`, strong DB and Redis passwords, the host on cgroup v1 as Judge0 requires, and no application credentials, SSH keys or cloud metadata access on that machine. `docker-compose.yml` uses `privileged: true`, which Judge0 requires, so the host must be dedicated and disposable. The compose file says it was never tested with Docker. `scripts/dev-judge0-shim.js` runs code without a sandbox and must never be used in production. REQUIRES MANUAL ACTION, NOT TESTED.

**R-07 First-solve points can double count in a race (Low).** `awardFirstSolve` reads then writes `profiles.total_points`. Two parallel accepted submissions of the same problem, on different serverless instances, can both pass the "first solve" check. The leaderboard is unaffected because it is computed from `judge_submissions`. A DB-side atomic award function would fix it. NOT FIXED.

**R-08 Sign-out by GET (Low).** `/api/auth/signout` accepts GET, so another site can log a user out by embedding it. No data impact. Changing it needs the sign-out button flow reworked. NOT FIXED.

**R-09 Public YouTube mirrors (Low).** When the YouTube API quota is exhausted, search falls back to Piped and Invidious instances run by third parties. Their results are rendered as escaped text, and thumbnails from other hosts are blocked by the CSP, but the data is untrusted and these hosts see your search terms. Consider removing the mirrors and keeping the curated and database fallbacks. NOT FIXED.

**R-10 Banned users can still register for contests (Low).** They cannot submit code (the judge route refuses), and banned users are hidden from the global leaderboard, but contest standings include registered participants. NOT FIXED.

**R-11 Logging and monitoring (Medium for incident response).** No error tracking, no alerting, no central log retention. Vercel function logs are short-lived on most plans. `admin_audit_log` now records admin actions once 005 is applied, but nothing records sign-in failures or suspicious API use. See `SECURITY_INCIDENT_RESPONSE.md` and the CERT-In retention point in `PRIVACY_COMPLIANCE_CHECKLIST.md`. REQUIRES MANUAL ACTION.

**R-12 Database tested in PGlite, not Supabase (limitation).** PGlite is real Postgres but has stand-ins for Supabase's roles and `auth` schema, and no PostgREST. Default Supabase grants, GoTrue behaviour and realtime were not exercised. Treat the first run of 005 on a staging copy as part of verification. NOT TESTED.

**R-13 Admin role changes are done with a script (Low).** `scripts/make-admin.mjs` uses the service role key from `.env.local`. It is an operator tool, not an exposure, but only run it from a trusted machine. Role changes made by any admin session are logged after 005. INFORMATIONAL.

**R-14 Content and licensing (see the compliance checklist).** The LeetCode sync scrapes problem metadata from LeetCode's GraphQL endpoint, which may conflict with their terms. Embedded YouTube videos are only embedded, not hosted. The seeded question bank is described as generated in-repo, but ownership of each problem statement should be confirmed. Needs your decision and possibly legal advice.

## Verification still owed by a human

Everything marked NOT TESTED in `SECURITY_TEST_REPORT.md`, a penetration test or at least an OWASP ZAP baseline scan against a staging deployment, and a review of the GitHub repository settings (secret scanning and push protection, branch protection, Dependabot alerts enabled, two-factor authentication on the GitHub, Vercel and Supabase accounts).
