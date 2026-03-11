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
