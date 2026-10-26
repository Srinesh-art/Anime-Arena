## 5. Test Deployment (Render Free)

### Architecture
- Frontend: Vercel builds the @anime-arena/web workspace from the monorepo root using vercel.json.
- Backend: Render Free runs the Express + Socket.IO service using render.yaml. Free instances may sleep when idle.
- Database: SQLite uses the instance's local filesystem (`./anime_arena.db`). Render Free does not provide a persistent disk, so database changes and saved rooms can be lost on restart, redeploy, or instance replacement. This setup is for a small friend-group test, not durable production hosting.
- Guest identity: The backend issues a signed guest-session token. Keep SESSION_SECRET private.
- CORS: Set CLIENT_ORIGIN to the exact public frontend origin. Multiple comma-separated origins are supported.

### Backend environment variables
- NODE_ENV=production
- SESSION_SECRET: generated strong server-side secret
- SQLITE_PATH=./anime_arena.db
- CLIENT_ORIGIN=https://anime-arena-ten.vercel.app (replace if the frontend URL changes)
- PORT is provided by Render automatically.

### Frontend environment variable
- VITE_SERVER_URL=https://your-backend-service.onrender.com

### Deployment order
1. Create the Render Free web service from render.yaml.
2. Set CLIENT_ORIGIN to the deployed Vercel frontend origin.
3. Set VITE_SERVER_URL in Vercel to the actual Render service URL and redeploy the frontend.
4. Verify `/api/health`, catalogue endpoints, Socket.IO session issuance, room creation/join, host authorization, and character picks using two or more clients.

### CI
GitHub Actions runs npm ci, npm test, and npm run build on pushes and pull requests to main.

### Important limitations
- No persistent disk is attached. SQLite data loss after restart/redeploy is possible; restart recovery cannot be guaranteed with Render Free.
- Keep the service to one instance when using SQLite.
- A guest token is a bearer credential. Do not share it; clearing browser storage creates a new guest identity.
