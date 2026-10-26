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
