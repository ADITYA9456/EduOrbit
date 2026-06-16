# Running EduOrbit on another machine (Windows / Mac / Linux)

This project is a **Next.js 14** app. Follow these steps and it will run on **any** machine without errors.

## ⚠️ The #1 rule: never zip `node_modules`

When you compress the project to a `.zip` and send it over WhatsApp, **delete the
`node_modules` and `.next` folders first**. Those folders contain native programs
that are built for *one specific operating system* (the Mac you built on). On
Windows they are useless and cause errors like:

```
bad interpreter: Operation not permitted
Cannot find module ...
```

`node_modules` is meant to be **rebuilt on each machine** with `npm install`.
The `.gitignore` already excludes it from git for the same reason.

### How to make the zip (on the Mac, before sending)

```bash
rm -rf node_modules .next
# then zip the EduOrbit folder
```

The `.env.local` file (with your API keys) **is** included in the zip, so the
other machine will have the keys it needs.

---

## Setup on the new machine

### 1. Install Node.js (one time only)
Download the **LTS** version from https://nodejs.org and install it.
This project needs **Node 18.18 or newer**.

### 2. Run the setup script

**Windows** — double-click `setup.bat` (or in `cmd`: `setup.bat`)

**Mac / Linux** — in a terminal inside the folder:
```bash
bash setup.sh
```

The script deletes any leftover dependencies, runs `npm install`, and starts the
app at **http://localhost:3000**.

### Prefer to do it manually?
```bash
npm install
npm run dev
```

> Note: the command is `npm run dev` — **not** `npx run dev`.
> `npx run dev` looks for a package called "run" and fails.

---

## Building for production / deployment

```bash
npm install
npm run build
npm run start
```

For hosting, **Vercel** is the easiest (it's made by the Next.js team):
1. Push this repo to GitHub.
2. Import it on https://vercel.com.
3. Add the environment variables from `.env.local` in the Vercel dashboard.

---

## Environment variables

The app reads these from `.env.local` (already included). For a real deployment,
set them in your host's dashboard instead of committing them:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY`
- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL`
