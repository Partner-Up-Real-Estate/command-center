# Jarrett's Command Center — Setup Guide

A private, single-user daily operating system for Whiteridge + Broki.

---

## Prerequisites

Make sure you have these installed on your Mac:

- **Node.js 18+** → https://nodejs.org (download the LTS version)
- **npm** (comes with Node)
- A terminal (Terminal.app or iTerm2)

To check: open Terminal and run:
```bash
node --version   # should show v18 or higher
npm --version    # should show 9 or higher
```

---

## Step 1 — Open the project folder

Open Terminal and navigate to the project:

```bash
cd ~/Desktop   # or wherever "Daily Workflow Management" is
cd "Daily Workflow Management/command-center"
```

---

## Step 2 — Install dependencies

```bash
npm install
```

This will download all packages (~200MB, takes 1–3 minutes the first time).

---

## Step 3 — Set up your environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` in any text editor and fill in the values:

### 3A — Generate NEXTAUTH_SECRET

Run this in Terminal:
```bash
openssl rand -base64 32
```
Paste the output as `NEXTAUTH_SECRET=`.

### 3B — Google OAuth (for login + calendar)

1. Go to https://console.cloud.google.com
2. Create a new project called "Command Center"
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Copy the **Client ID** → `GOOGLE_CLIENT_ID=`
7. Copy the **Client Secret** → `GOOGLE_CLIENT_SECRET=`
8. Go to **APIs & Services → Library**, search for and enable:
   - **Google Calendar API**

### 3C — Database

For local development, SQLite is already configured. Leave `DATABASE_URL` as:
```
DATABASE_URL="file:./dev.db"
```

### 3D — Anthropic API (for hook generation)

1. Go to https://console.anthropic.com
2. Create an API key
3. Paste it as `ANTHROPIC_API_KEY=`

### 3E — Social APIs (optional — connect when ready)

These are optional. The app works without them; you'll just see "Not connected" on the platforms. You can add them later:

- **Meta (Instagram + Facebook):** Create app at https://developers.facebook.com
- **LinkedIn:** Create app at https://www.linkedin.com/developers
- **TikTok:** Apply at https://developers.tiktok.com (requires business approval)
- **YouTube:** Get API key from Google Cloud Console (same project as above)

---

## Step 4 — Set up the database

```bash
npm run db:generate   # generates Prisma client
npm run db:push       # creates the SQLite database file
```

You should see: `The database is now in sync with your Prisma schema.`

---

## Step 5 — Run the app

```bash
npm run dev
```

Open your browser and go to: **http://localhost:3000**

You'll be redirected to the login page. Click "Continue with Google" and sign in with `jarrett@whiteridge.ca`.

---

## Daily Use (after first setup)

Every day, just:
```bash
cd "path/to/command-center"
npm run dev
```
Then open http://localhost:3000 in your browser. Your session persists for 7 days so you won't need to log in every time.

---

## Deploying to the web (optional)

To access from anywhere (not just your laptop):

### Option A — Vercel (recommended, free)

1. Push the project to a private GitHub repo
2. Go to https://vercel.com and import the repo
3. Add all your `.env.local` values as Environment Variables in Vercel's dashboard
4. Update `NEXTAUTH_URL` to your Vercel URL (e.g., `https://command-center.vercel.app`)
5. Update your Google OAuth redirect URI to include: `https://your-vercel-url.vercel.app/api/auth/callback/google`
6. Deploy — Vercel handles everything else

### Option B — Run on your Mac permanently

Use `npm run start` (after `npm run build`) with a process manager like `pm2`:
```bash
npm install -g pm2
npm run build
pm2 start npm --name "command-center" -- start
pm2 startup   # auto-start on Mac login
```

---

## Troubleshooting

**"Module not found" errors** → Run `npm install` again

**"PrismaClientKnownRequestError"** → Run `npm run db:push` again

**Google sign-in says "Access denied"** → Make sure you're signing in with `jarrett@whiteridge.ca` (only that email is whitelisted)

**Calendar shows no events** → Make sure Google Calendar API is enabled in Google Cloud Console and you've signed in with your Google account (the OAuth flow requests calendar permissions)

**Port 3000 already in use** → Run `npm run dev -- -p 3001` and open http://localhost:3001

---

## What's built

| Page | URL | Status |
|------|-----|--------|
| Login | /login | ✅ Full Google OAuth |
| Dashboard | /dashboard | ✅ All panels, real calendar, localStorage state |
| Calendar | /calendar | ✅ Week view, add events |
| Content Studio | /content | ✅ Compose, history, analytics (platform APIs need approval) |
| Growth Intel | /growth | ✅ Track accounts, AI hook generator |
| Settings | /settings | ✅ Profile, connections, preferences |

## API keys checklist

- [ ] `NEXTAUTH_SECRET` — generated locally
- [ ] `GOOGLE_CLIENT_ID` — from Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- [ ] `ANTHROPIC_API_KEY` — from Anthropic Console
- [ ] `META_APP_ID` — optional, for Instagram/Facebook posting
- [ ] `META_APP_SECRET` — optional
- [ ] `LINKEDIN_CLIENT_ID` — optional
- [ ] `LINKEDIN_CLIENT_SECRET` — optional
- [ ] `TIKTOK_CLIENT_KEY` — optional (requires business approval)
- [ ] `TIKTOK_CLIENT_SECRET` — optional
- [ ] `YOUTUBE_API_KEY` — optional
- [ ] `ENCRYPTION_KEY` — 32 random chars for encrypting stored tokens

Generate `ENCRYPTION_KEY`:
```bash
openssl rand -hex 16
```
