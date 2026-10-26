# Anime Arena — Multiplayer Anime Character Drafting Platform

A real-time, cross-verse anime character drafting web platform built with React 19, TypeScript, Tailwind CSS, Express, Socket.IO, Better-SQLite3, and Vitest.

---

## 1. System Architecture

- **`@anime-arena/shared`**: Shared TypeScript contracts, Zod schemas, and data types (`Player`, `DraftState`, `Character`, `DraftPick`, `RoomSettings`).
- **`@anime-arena/server`**: Server-authoritative game engine with:
  - Turn manager with strict Snake Draft & Sequential Draft generation.
  - SQLite persistent database storage (`better-sqlite3` with WAL mode).
  - Socket.IO real-time synchronized event broadcaster.
  - Canonical identity & form-specific deduplication policies.
  - Multi-universe catalogue database (Dragon Ball, Naruto, One Piece, Jujutsu Kaisen, Bleach, Attack on Titan, Hunter x Hunter, Solo Leveling, Demon Slayer, Frieren).
- **`@anime-arena/web`**: High-density desktop and touch-friendly mobile frontend with:
  - Room creation and code generation.
  - Interactive synchronized lobby with Ready checks.
  - Real-time active draft arena with authoritative turn indicators & countdown timer.
  - Searchable character pool with franchise filtering.
  - Live player rosters, pick history, and post-match rematch flows with celebratory confetti.

---

## 2. Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9

### Installation
```bash
# Clone and enter directory
cd anime-arena

# Install dependencies across monorepo workspaces
npm install
```

### Running the Application
```bash
# 1. Start backend server (Port 4000)
cd apps/server
npm run dev

# 2. In a separate terminal, start frontend web application (Port 5173)
cd apps/web
npm run dev
```

Open `http://localhost:5173` in two browser windows or share your local IP to test live multiplayer drafting.

---

## 3. Automated Test Suite

Run unit and end-to-end multi-client integration tests:

```bash
cd apps/server
npx vitest run
```

Verified test coverage includes:
- **`src/tests/engine.test.ts`**:
  - Snake turn order generation (`A->B->C, C->B->A, A->B->C`).
  - Sequential turn order generation (`A->B->C, A->B->C`).
  - Canonical identity policy enforcement (rejecting duplicate picks across alternate forms).
  - Form-specific mode validation.
- **`src/tests/multiplayer.test.ts`**:
  - Full real-time Socket.IO multi-client integration test simulating two independent players creating a room, joining with code, starting the draft, taking turns picking across anime universes (Dragon Ball, Naruto, Jujutsu Kaisen, One Piece), verifying snake turn reversals, and completing the draft.

---

## 4. Production Build & Deployment

```bash
# Build shared package
cd packages/shared && npm run build

# Build server
cd ../../apps/server && npm run build

# Build web frontend
cd ../web && npm run build
```
Frontend static assets are generated in `apps/web/dist/` ready to host on Vercel, Cloudflare Pages, or Netlify, with the persistent Socket.IO server deployable to Render, Railway, Fly.io, or any Node.js container environment.

---

## 5. Production Deployment

### Architecture
- Frontend: Vercel builds the @anime-arena/web workspace from the monorepo root using vercel.json.
- Backend: Render runs the persistent Express + Socket.IO service using render.yaml.
- Database: SQLite is stored at /var/data/anime_arena.db on a Render persistent disk. Render Free web services do not support persistent disks; select an eligible paid service plan before creating the backend.
- Guest identity: The backend issues a signed guest-session token. Set SESSION_SECRET to a strong persistent secret in production. Do not expose it to the frontend.
- CORS: Set CLIENT_ORIGIN to the exact public frontend origin (for example, the Vercel production domain). Multiple comma-separated origins are supported.

### Required production configuration

Backend environment variables:
- NODE_ENV=production
- SESSION_SECRET — strong server-side secret; Render can generate one from the Blueprint.
- SQLITE_PATH=/var/data/anime_arena.db
- CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
- PORT is provided by Render automatically.

Frontend environment variable:
- VITE_SERVER_URL=https://your-backend-service.onrender.com

### Deployment order
1. Push the repository to GitHub and connect it to Vercel and Render.
2. Create the Render Web Service from render.yaml; attach its 1 GB persistent disk. This is a paid resource.
3. Set CLIENT_ORIGIN in Render to the frontend origin. The production server intentionally refuses to start without this value and SESSION_SECRET.
4. Configure VITE_SERVER_URL in Vercel to the Render service URL, then redeploy the frontend.
5. Verify GET /api/health, catalogue endpoints, Socket.IO guest-session issuance, room creation/join, host authorization, canonical character picks, and reconnect/restart recovery.

### CI
GitHub Actions runs npm ci, npm test, and npm run build on pushes and pull requests to main.

### Notes
- The SQLite database is local to a single Render instance; do not scale the service horizontally while using this database.
- A guest token is a bearer credential. Do not share it; clearing browser storage creates a new guest identity.
- Room recovery preserves stored room state and grants the current player a fresh turn deadline after a backend restart.
