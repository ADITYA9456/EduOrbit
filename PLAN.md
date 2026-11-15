# EduOrbit Redesign Plan

Note: CLAUDE.md does not exist in the repo, so Phase A was run from the task brief alone.

## Phase A: Inventory and tokens

### 1. Stack
| Item | Version | Source |
|---|---|---|
| Next.js | 14.2.35 (pinned) | package.json |
| React / React DOM | ^18.2.0 | package.json |
| Tailwind CSS | ^3.4.1, `preflight` and `container` disabled | package.json, tailwind.config.js |
| Router | **App Router** (`src/app`, route groups, `layout.js`, `route.js`) | src/app |

Other notes: JavaScript only (jsconfig, no TS). Supabase (`@supabase/ssr`). The root layout is `force-dynamic`.

### 2. Auth model
- `src/middleware.js` calls `updateSession` on every request except static assets.
- `PROTECTED_ROUTES = /upload, /profile, /admin`. Unauthenticated users are redirected to `/login?redirect=...`.
- `AUTH_ROUTES = /login, /signup`. Authenticated users are redirected to `/home`.
- Admin is only checked client-side: `AuthProvider.isAdmin = profile.role === 'admin'`. `/admin` redirects non-admins in a `useEffect` and renders `null`. **Middleware only checks login, not role.** Admin API routes do check `profiles.role` on the server.

### 3. Routes (pages)
All data is fetched client-side with the Supabase browser client or `fetch` to `/api/*`. No page fetches on the server.

| Route | File | Auth | Data fetched |
|---|---|---|---|
| `/` | app/page.js | public | `redirect('/home')` |
| `/login` | (auth)/login | guests only | `useAuth().signIn / signInWithGoogle / sendPhoneOtp / verifyPhoneOtp` |
| `/signup` | (auth)/signup | guests only | `useAuth().signUp` and the same OAuth/OTP methods |
| `/home` | (main)/home | public | `fetch` video search (`/api/youtube/search`), `useAuth` |
| `/shorts` | (main)/shorts | public | `fetch` (`/api/youtube/search`, no-store) |
| `/video/[id]` | (main)/video/[id] | public | `/api/youtube/video?id=` |
| `/coding` | (main)/coding | public. User data only when logged in | `coding_problems`, `user_progress`, `bookmarks`; `/api/daily-challenge`, `/api/bookmarks` (POST) |
| `/coding/[id]` | (main)/coding/[id] | public. Submit and bookmark need login | `coding_problems` (by id or slug), `bookmarks`, `submissions`; `/api/coding/submit`, `/api/progress`, `/api/bookmarks` |
| `/practice` | (main)/practice | public | `questions` |
| `/contests` | (main)/contests | public | `contests`, `contest_participants` |
| `/contests/[id]` | (main)/contests/[id] | public. Submit needs login | `contests`, `contest_problems`, `leaderboard_entries`; `/api/coding/submit` |
| `/leaderboard` | (main)/leaderboard | public | `profiles` |
| `/profile` | (main)/profile | **login required** | `submissions`, `streaks`; `/api/bookmarks`; `updateProfile` |
| `/upload` | (main)/upload | **login required** | `/api/videos/verify`, `/api/videos/submit` |
| `/admin` | (main)/admin | **ADMIN** (login via middleware, role via client check) | counts on `profiles`, `videos`, `coding_problems`, `submissions`, `reports`; lists from `videos`, `reports`, `profiles`, `ai_verification_logs`; updates on `videos`, `reports`, `profiles` |
| not-found | app/not-found.js | public | none |
| error / loading | app/error.js, app/loading.js, (main)/loading.js | n/a | none |

**Admin routes:** `/admin` (page), plus admin-only API methods: `POST /api/questions`, `PUT/DELETE /api/questions/[slug]`, and `/api/sync-leetcode`. The Header and Sidebar show admin links when `isAdmin`.

### 4. API routes (for reference)
| Route | Auth |
|---|---|
| `GET /api/auth/callback`, `/api/auth/signout` | n/a |
| `/api/bookmarks` GET and POST | login (401) |
| `/api/progress` GET and POST | login (401) |
| `/api/coding/submit` | login (401) |
| `/api/videos/submit`, `/api/videos/report` | login (401) |
| `/api/videos/verify` | public (writes `ai_verification_logs` with the admin client) |
| `/api/questions` GET | public |
| `/api/questions` POST | **admin** (403) |
| `/api/questions/[slug]` GET | public |
| `/api/questions/[slug]` PUT and DELETE | **admin** (403) |
| `/api/sync-leetcode` | **admin** (checks `profiles.role`) |
| `/api/daily-challenge` | public |
| `/api/youtube/search`, `/api/youtube/video` | public |

### 5. Layout, header, sidebar, MainLayout
| File | Role | Imported by |
|---|---|---|
| `src/app/layout.js` | Root layout: fonts, providers, Toaster, theme script | Next.js (root) |
| `src/app/(auth)/layout.js` | Passthrough fragment | Next.js |
| `src/app/(main)/layout.js` | Wraps children in `MainLayout` | Next.js; imports `MainLayout` |
| `src/app/(main)/template.js`, `loading.js` | Route transition and loading | Next.js |
| `src/components/layout/MainLayout.js` | Shell: Header + Sidebar + Footer | **`src/app/(main)/layout.js`** (only importer) |
| `src/components/layout/Header.js` | Top bar | **`src/components/layout/MainLayout.js`** (only importer) |
| `src/components/layout/Sidebar.js` | Left nav | **`src/components/layout/MainLayout.js`** (only importer) |
| `src/components/layout/Footer.js` | Footer | **`src/components/layout/MainLayout.js`** (only importer) |

Every page under `(main)` renders inside `MainLayout`. `/login`, `/signup`, `/`, and not-found do not.

Other shared components (used by pages):
- `ui/EmptyState` in coding, contests, leaderboard, admin.
- `ui/CountdownTimer` in contests and contests/[id].
- `ui/Typewriter` in home.
- `ui/Dialog` and `ui/Table` in admin (**untracked in git**).
- `video/AISummaryPanel` in home and shorts.
- `video/CategoryPills` in home and shorts.
- `video/VideoListItem` in home and shorts.
- `video/VideoCard` in video/[id].
- `video/VideoGrid` has no importers (unused).

### 6. Design tokens (current)
Files: `src/app/globals.css` (base, `:root` and `[data-theme="light"]`) and `src/app/premium.css` (loaded after it).

**Live palette:** dark navy with blue-violet accents ("EduOrbite" dark). The default is dark (`<html data-theme="dark">`). A light theme is applied via `data-theme="light"` and saved in localStorage as `eduorbite-theme`.
**Live fonts:** Inter (`--font-inter`) for UI and JetBrains Mono (`--font-jetbrains`) for code, both loaded through `next/font/google`.

| Token | Dark (`:root`) | Light override |
|---|---|---|
| `--bg-primary` | #07090f | #f8fafc |
| `--bg-secondary` / `--bg-card` | #0d1220 | #ffffff |
| `--bg-tertiary` | #141b2d | #f1f5f9 |
| `--bg-elevated` | #172036 | #ffffff |
| `--bg-hover` | #1a2542 | #e2e8f0 |
| `--text-primary` | #eef2fb | #0f172a |
| `--text-secondary` | #a3afc6 | #475569 |
| `--text-muted` | #6b7794 | #94a3b8 |
| `--text-inverse` | #07090f | #ffffff |
| `--accent-primary` | #5b8cff | #3b6df0 |
| `--accent-secondary` | #a066ff | (none) |
| `--accent-tertiary` | #22d3ee | (none) |
| `--accent-gradient` | 135deg #5b8cff to #a066ff | (none) |
| `--accent-gradient-wide` | cyan, blue, violet, pink | (none) |
| `--success` / `--warning` / `--danger` / `--info` | #10b981 / #f59e0b / #ef4444 / #06b6d4 | (none) |
| `--border-color` | #1d2742 | #e2e8f0 |
| `--border-light` | #2d3b60 | #cbd5e1 |
| `--glass-bg` | rgba(13,18,32,.62) | rgba(255,255,255,.72) |
| `--glass-border` | rgba(255,255,255,.07) | rgba(15,23,42,.08) |
| `--shadow-sm/md/lg` | 0 1px 3px .3 / 0 4px 12px .4 / 0 8px 32px .5 | .06 / .08 / .12 |
| `--shadow-glow` | 0 0 24px rgba(91,140,255,.35) | 0 0 20px rgba(59,130,246,.15) |
| `--radius-sm/md/lg/xl/full` | 6 / 10 / 16 / 24 / 9999 px | (none) |
| `--font-primary` / `--font-mono` | Inter stack / JetBrains Mono stack | (none) |
| `--font-xs...4xl` | .75, .875, 1, 1.125, 1.25, 1.5, 2, 2.5 rem | (none) |
| `--space-xs...3xl` | .25, .5, 1, 1.5, 2, 3, 4 rem | (none) |
| `--sidebar-width` / `--sidebar-collapsed` / `--header-height` / `--max-width` | 240 / 72 / 64 / 1400 px | (none) |
| `--transition-fast/normal/slow` | 150 / 250 / 400 ms ease | (none) |
| `--ease-out-expo`, `--ease-spring` | cubic-bezier(.16,1,.3,1), (.34,1.56,.64,1) | (none) |
| `--z-dropdown/sticky/fixed/modal-backdrop/modal/toast` | 100 / 200 / 300 / 400 / 500 / 600 | (none) |
| Aliases (premium.css): `--accent`, `--secondary-accent`, `--border`, `--surface-secondary`, `--focus-ring` | map to the tokens above | follow automatically |

Tokens with no light override are theme-neutral (spacing, radius, type, z-index, and so on) or accent colours that read fine on both themes. The hardcoded gradients and glow rgba values in premium.css are blue-based and used as-is on both themes.

Findings:
- Every `var(--x)` used in src/ is defined, so there are no undefined tokens.
- The status colours (`--success`, `--warning`, `--danger`, `--info`) have no soft background variants, no on-accent text colour, and no overlay or scrim token.
- Many components hardcode `rgba(255,255,255,.0x)` hover and fill backgrounds, then patch light mode with `[data-theme="light"]` overrides. A token (`--surface-hover`) now exists for later phases.
- Tailwind `colors` previously mapped only 7 tokens.

### 7. Tokens added in Phase A
No existing value was changed. Added to `premium.css`, each with a dark and a light value:
`--text-on-accent`, `--overlay`, `--accent-soft`, `--success-soft`, `--warning-soft`, `--danger-soft`, `--info-soft`, `--surface-hover`, `--shadow-xl`.

Mapped into the Tailwind theme (`tailwind.config.js`): colours `on-accent`, `overlay`, `accent-soft`, `success-soft`, `warning-soft`, `danger-soft`, `info-soft`, `surface-hover`; shadow `xl2`.

### 8. Before screenshots
`docs/redesign/before/{route}__{1440|390}__{light|dark}.png` (full page).
Dynamic routes use a real coding slug when available, a placeholder UUID for `/contests/[id]`, and `dQw4w9WgXcQ` for `/video/[id]`. Login-protected routes were captured **logged out**, so those shots show the login redirect. `/profile`, `/upload`, and `/admin` are therefore identical to the login screenshot (64 files total: 16 routes x 2 widths x 2 themes). Admin and profile views need a signed-in session, which was not available; recapture them after login if the redesign needs "before" shots of those pages.
The existing server on :3100 (`next start`) was left untouched. Shots came from a separate dev server on :3217.
