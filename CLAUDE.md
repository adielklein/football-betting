# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (backend/)
```bash
cd backend && npm start          # Production: node server.js (port 5000)
cd backend && npm run dev         # Development: nodemon server.js
```
Requires `backend/.env` with MONGODB_URI, VAPID keys, IMGBB_API_KEY.

### Frontend (frontend/)
```bash
cd frontend && npm start          # Dev server on port 3000
cd frontend && npm run build      # Production build
cd frontend && npm test           # Jest + React Testing Library
```

## Architecture

**Monorepo** with two independent Node.js projects (no shared workspace):
- `backend/` — Express REST API + MongoDB (Mongoose)
- `frontend/` — React 18 SPA (Create React App, pure JavaScript, no TypeScript)

### Backend Structure

**Entry:** `backend/server.js` — Express setup, CORS config, MongoDB connection, route registration, auto-creates default admin user on startup.

**Models** (`backend/models/`): User, Week, Match, Bet, Score, League — all Mongoose schemas. Key relationships:
- Match belongs to Week + League (via weekId, leagueId refs)
- Bet belongs to User + Match + Week (unique constraint on userId+matchId)
- Score belongs to User + Week (unique constraint on userId+weekId)

**Routes** (`backend/routes/`): auth, weeks, matches, bets, scores, leagues, notifications, upload. Each file is a self-contained Express Router.

**Services** (`backend/services/pushNotifications.js`): Web Push notification service with multi-device support and ImgBB image upload.

### Frontend Structure

**No React Router** — routing is conditional rendering in `App.js` based on `currentUser.role` (admin vs player). Internal navigation uses tab state within each view.

**No centralized state management** — useState + props drilling. User persisted in localStorage (`football_betting_user`).

**No auth tokens** — user object (with id, role) stored client-side and userId sent in request bodies. Admin checks are done server-side per-endpoint.

**API client** (`frontend/src/services/api.js`): Plain fetch wrapper. Base URL auto-switches between localhost:5000 and production Render URL based on `window.location.hostname`.

**Components:**
- `components/player/` — PlayerView (tabs: betting, allbets, leaderboard, history), BettingInterface, Leaderboard, AllBetsViewer, HistoryViewer
- `components/admin/` — AdminView (tabs: weeks, leagues, users, bets, push), WeeksManagement, UsersManagement, LeaguesManagement, BetsManagement, PushManagement
- `components/Login.js`, `components/NotificationSettings.js`

**Theme system** (`frontend/src/themes.js` + `backend/themes.js`): 20+ team-branded themes applied via CSS variables on `document.documentElement`. The `applyTheme(user)` function handles iOS Safari compatibility.

## Deploy Workflow (mandatory)

**Every change goes to staging first, and to production only after the user explicitly approves.**
1. Commit and push to the dev branch `claude/seasonal-leaderboard-football-6l7qqs`. Both staging services auto-deploy from it.
2. Tell the user what to check on https://football-betting-staging.onrender.com.
3. Merge to `main` (production, Render auto-deploys) **only** after the user approves that specific change (e.g. "מזג", "תעלה לפרוד"). Never merge to `main` on your own, even for small fixes.

## Staging (סביבת ניסוי)

Two extra Render services track the dev branch, so changes can be tried on a phone before merging to `main`:
- `football-betting-staging` (static site, root `frontend`) → https://football-betting-staging.onrender.com
- `football-betting-backend-staging` (web service, root `backend`), env `APP_ENV=staging`

How it's wired:
- `frontend/src/config.js` picks the API by hostname: any host containing `staging` → staging backend. All screens import `API_URL` from there (never hardcode the backend URL). Staging shows a "🧪 סביבת ניסוי" badge.
- `backend/services/environment.js` exposes `IS_STAGING`. In staging: CORS accepts only the staging site, no keep-alive ping (it should sleep — free-tier hours are shared with production), and push is sent only to devices registered on staging (`subscription.env === 'staging'`).
- Internal cron calls go to `127.0.0.1:PORT` (the server itself), never to a fixed production URL.
- `backend/services/stagingSeed.js`: on startup, if `SEED_FROM_MONGODB_URI` is set, copies all collections from production (read-only) into staging's own database, dropping users' push devices. Runs again only when `STAGING_SEED_VERSION` changes. Refuses if source and target are the same database.

## Key Business Logic

### Week Lifecycle
Create week → Add matches (with optional odds) → Activate (set lockTime + optional push notification) → Players bet before lockTime → Admin enters match results → Admin triggers score calculation → Leaderboard updates

### Betting Rules (backend/routes/bets.js)
- Week must be `active: true`, `locked: false`, and current time < `lockTime`
- **Admin users bypass all lock checks**
- Bets upsert on userId+matchId (create or update)

### Scoring Algorithm (backend/routes/scores.js)
- **Without odds:** Exact score = 3 pts, correct direction (home/draw/away) = 1 pt
- **With odds:** Exact = `odd * 2/3`, correct direction = `odd / 3` (rounded to 0.1)
- Leaderboard excludes admin users
- `totalScore` is cumulative across all weeks

## Language & UI
- Hebrew (RTL) throughout — all UI strings are in Hebrew
- iOS Safari has extensive compatibility fixes in CSS and theme application
- Inline styles used extensively alongside CSS variables
- **Always respond to the user in Hebrew (עברית)**
