# EduOrbit — AI-Powered Education + Coding Platform

A production-ready **Next.js 14** (App Router) application powered by **Supabase** for auth, database, and edge functions. Features an AI-powered video verification system, coding practice platform, competitive contests, and gamification.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, JavaScript (no TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **UI**: Custom CSS design system (dark-mode first), react-icons, react-hot-toast
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Auth**: Supabase Auth with @supabase/ssr for SSR cookie handling

## Features

### 🎥 AI Video Platform
- YouTube video submission with AI educational verification
- Admin approval workflow
- Category-based browsing, search, pagination
- Video reporting system (auto-unpublish at 10 reports)

### 💻 Coding Practice
- Curated coding problems (Easy/Medium/Hard)
- Monaco code editor with multi-language support (JS, Python, C++, Java)
- Test case execution and results display
- Submission history tracking

### 🏆 Contests & Leaderboard
- Timed coding contests with countdown timers
- Real-time leaderboard with scoring
- Contest problem sets with point values

### 👤 Gamification
- Points system (10/25/50 for Easy/Medium/Hard)
- Achievement badges (First Solve, 10 Solver, 50 Solver, etc.)
- Streak tracking with activity calendar
- Global leaderboard sorted by points/solved/streak

### 🛡️ Admin Panel
- Platform statistics dashboard
- Pending video moderation
- Report management
- User management (ban/unban)
- AI verification logs

## Getting Started

> **Moving this project to another computer (Windows / Mac / Linux)?**
> See **[SETUP.md](SETUP.md)** for the cross-platform setup guide. The short
> version: never zip the `node_modules` folder — run `npm install` on each machine.

### Prerequisites
- Node.js **18.18+** (an `.nvmrc` pins 18.18.0 — run `nvm use` if you use nvm)
- Supabase account ([supabase.com](https://supabase.com))

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project.
2. Open the **SQL Editor** and run the schema files included in this repo:
   - `database-schema.sql` — tables, RLS policies, triggers, and seed data
   - `supabase/questions.sql` — coding-problem seed data
3. Optionally seed extra data with the scripts in `scripts/` (see comments in each file).

### 3. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local     # macOS / Linux
copy .env.example .env.local   # Windows (cmd)
```

Only the Supabase variables are required to boot the app; the rest are optional
(see [.env.example](.env.example) and the [Environment Variables](#environment-variables) section below).

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
(The command is `npm run dev` — not `npx run dev`.)

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only key for API routes/scripts |
| `AI_PROVIDER` | optional | `mock` (default) or `gemini` for AI video verification |
| `GEMINI_API_KEY` | optional | Required only when `AI_PROVIDER=gemini` |
| `YOUTUBE_API_KEY` | optional | Enables in-app YouTube search/import |
| `LEETCODE_SYNC_SECRET` | optional | Guards the LeetCode sync endpoint/script |
| `NEXT_PUBLIC_APP_URL` | optional | Public base URL of the deployment |

## Project Structure

```
eduorbite-next/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login & Signup (no sidebar)
│   │   ├── (main)/          # Authenticated pages with layout
│   │   │   ├── home/        # Video grid homepage
│   │   │   ├── video/[id]/  # Video player
│   │   │   ├── upload/      # Submit videos
│   │   │   ├── coding/      # Problem listing
│   │   │   ├── coding/[id]/ # Problem + editor
│   │   │   ├── contests/    # Contest listing
│   │   │   ├── contests/[id]/ # Contest detail
│   │   │   ├── leaderboard/ # Global leaderboard
│   │   │   ├── profile/     # User profile
│   │   │   └── admin/       # Admin panel
│   │   ├── api/             # API route handlers
│   │   │   ├── auth/callback/
│   │   │   ├── videos/verify/
│   │   │   ├── videos/submit/
│   │   │   ├── videos/report/
│   │   │   └── coding/submit/
│   │   ├── globals.css
│   │   └── layout.js
│   ├── components/
│   │   ├── layout/          # Header, Sidebar, MainLayout
│   │   ├── video/           # VideoCard, VideoGrid, CategoryPills
│   │   └── ui/              # CountdownTimer, EmptyState
│   ├── context/             # AuthProvider, ThemeProvider
│   ├── hooks/               # useStreak
│   ├── lib/
│   │   ├── supabase/        # client.js, server.js, middleware.js
│   │   ├── constants.js
│   │   └── utils.js
│   └── middleware.js         # Auth session refresh + route protection
├── scripts/                 # Seed / sync helper scripts (Node)
├── supabase/
│   └── questions.sql        # Coding-problem seed data
├── database-schema.sql      # Full DB schema, RLS, triggers, seed data
├── package.json
├── next.config.js
├── .env.example
├── .nvmrc                   # Pinned Node version (18.18.0)
└── SETUP.md                 # Cross-platform setup guide
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Deploy

### Supabase Edge Functions (Optional)

```bash
supabase functions deploy ai-verify-video
supabase functions deploy execute-code
```

## Design System

- **Dark mode default** with light mode toggle
- CSS custom properties for theming
- YouTube-inspired layout (sidebar + content grid)
- Color palette: Navy (#0f0f23), Purple accent (#6c5ce7), Teal secondary (#00cec9)
- Fonts: Inter (UI), JetBrains Mono (code)

## License

MIT
