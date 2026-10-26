import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { db, initDb } from './db/schema';
import { seedCatalogue } from './db/seed';
import { RoomManager } from './engine/RoomManager';
import { Player, Character, RoomSettings, PlayerSchema, RoomCodeSchema, RoomSettingsSchema } from '@anime-arena/shared';

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN must be configured in production.');
}
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Initialize SQLite database and seed initial catalogue
initDb();
seedCatalogue();
RoomManager.restoreRooms();

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

const SESSION_SECRET = process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : randomBytes(32).toString('hex'));
if (!SESSION_SECRET) throw new Error('SESSION_SECRET must be configured in production.');

function signSessionToken(playerId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: playerId })).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return payload + '.' + signature;
}

function verifySessionToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const expected = createHmac('sha256', SESSION_SECRET).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return typeof payload.sub === 'string' && payload.sub.length >= 16 ? payload.sub : null;
  } catch { return null; }
}

io.use((socket, next) => {
  const suppliedToken = socket.handshake.auth?.sessionToken;
  const verifiedId = verifySessionToken(suppliedToken);
  const playerId = verifiedId || randomUUID();
  socket.data.playerId = playerId;
  socket.data.sessionToken = verifiedId ? suppliedToken : signSessionToken(playerId);
  next();
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.get('/api/catalogue/anime', (req, res) => {
  const rows = db.prepare('SELECT * FROM anime').all() as any[];
  const animeList = rows.map(r => ({
    id: r.id,
    franchiseId: r.franchise_id,
    canonicalTitle: r.canonical_title,
    englishTitle: r.english_title,
    originalTitle: r.original_title,
    description: r.description,
    coverImage: r.cover_image,
    genres: JSON.parse(r.genres || '[]')
  }));
  res.json({ anime: animeList });
});

app.get('/api/catalogue/characters', (req, res) => {
  const { search, franchise } = req.query;
  let query = 'SELECT * FROM characters WHERE 1=1';
  const params: any[] = [];

  if (franchise && typeof franchise === 'string') {
    query += ' AND franchise = ?';
    params.push(franchise);
  }

  if (search && typeof search === 'string') {
    query += ' AND (name LIKE ? OR aliases LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = db.prepare(query).all(...params) as any[];
  const characters: Character[] = rows.map(r => ({
    id: r.id,
    canonicalId: r.canonical_id,
    animeId: r.anime_id,
    franchise: r.franchise,
    name: r.name,
    originalName: r.original_name,
    aliases: JSON.parse(r.aliases || '[]'),
    form: r.form,
    imageUrl: r.image_url,
    role: r.role,
    description: r.description
  }));

  res.json({ characters, count: characters.length });
});

// Server-authoritative turn timeout processing.
setInterval(() => {
  for (const result of RoomManager.processExpiredTurns()) {
    if (result.pick) io.to(result.state.roomCode).emit('draft:pick:accepted', { pick: result.pick, state: result.state });
    io.to(result.state.roomCode).emit('draft:state', result.state);
  }
}, 1000).unref();

// Socket.IO Real-time Connection Handlers
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;
  socket.emit('session:identity', { playerId: socket.data.playerId as string, sessionToken: socket.data.sessionToken as string });

  socket.on('room:create', (payload: { player?: Partial<Player>; settings?: Partial<RoomSettings> } | null, callback) => {
    try {
      const parsedPlayer = PlayerSchema.safeParse({ ...payload?.player, id: socket.data.playerId, isHost: true, isReady: false, connected: true, joinedAt: Date.now() });
      const parsedSettings = RoomSettingsSchema.partial().safeParse(payload?.settings ?? {});
      if (!parsedPlayer.success || !parsedSettings.success) { callback?.({ success: false, error: 'Invalid player or room settings.' }); return; }
      const player = parsedPlayer.data;
      const settings = parsedSettings.data;
      const state = RoomManager.createRoom(player, settings);
      currentRoomCode = state.roomCode;
      currentPlayerId = player.id;
      socket.join(state.roomCode);

      if (callback) callback({ success: true, roomCode: state.roomCode, state });
      io.to(state.roomCode).emit('draft:state', state);
    } catch (err: any) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('room:join', (payload: { roomCode?: unknown; player?: Partial<Player> } | null, callback) => {
    try {
      const parsedCode = RoomCodeSchema.safeParse(payload?.roomCode);
      const parsedPlayer = PlayerSchema.safeParse({ ...payload?.player, id: socket.data.playerId, isHost: false, isReady: false, connected: true, joinedAt: Date.now() });
      if (!parsedCode.success || !parsedPlayer.success) { callback?.({ success: false, error: 'Invalid room code or player details.' }); return; }
      const roomCode = parsedCode.data;
      const player = parsedPlayer.data;
      const result = RoomManager.joinRoom(roomCode, player);
      if (result.error || !result.state) {
        if (callback) callback({ success: false, error: result.error || 'Failed to join' });
        return;
      }

      currentRoomCode = result.state.roomCode;
      currentPlayerId = player.id;
      socket.join(result.state.roomCode);

      if (callback) callback({ success: true, state: result.state });
      io.to(result.state.roomCode).emit('draft:state', result.state);
    } catch (err: any) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('room:ready', ({ isReady }: { isReady: boolean }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const state = RoomManager.setReady(currentRoomCode, currentPlayerId, isReady);
    if (state) {
      io.to(currentRoomCode).emit('draft:state', state);
    }
  });

  socket.on('room:settings:update', (payload: { settings?: Partial<RoomSettings> } | null, callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const parsedSettings = RoomSettingsSchema.partial().safeParse(payload?.settings ?? {});
    if (!parsedSettings.success) { callback?.({ success: false, error: 'Invalid room settings.' }); return; }
    const result = RoomManager.updateSettings(currentRoomCode, currentPlayerId, parsedSettings.data);
    if (result.error) {
      if (callback) callback({ success: false, error: result.error });
      return;
    }
    if (result.state) {
      if (callback) callback({ success: true, state: result.state });
      io.to(currentRoomCode).emit('draft:state', result.state);
    }
  });

  socket.on('draft:start', (callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const result = RoomManager.startGame(currentRoomCode, currentPlayerId);
    if (result.error) {
      if (callback) callback({ success: false, error: result.error });
      return;
    }
    if (result.state) {
      if (callback) callback({ success: true, state: result.state });
      io.to(currentRoomCode).emit('draft:state', result.state);
    }
  });

  socket.on('draft:pick', (payload: { character?: { id?: unknown } } | null, callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const characterId = payload?.character?.id;
    if (typeof characterId !== 'string' || characterId.length < 1 || characterId.length > 100) {
      callback?.({ success: false, error: 'Invalid character selection.' });
      socket.emit('draft:pick:rejected', { reason: 'Invalid character selection.' });
      return;
    }
    const result = RoomManager.makePick(currentRoomCode, currentPlayerId, { id: characterId } as Character);
    if (result.error) {
      if (callback) callback({ success: false, error: result.error });
      socket.emit('draft:pick:rejected', { reason: result.error });
      return;
    }
    if (result.state && result.pick) {
      if (callback) callback({ success: true, pick: result.pick, state: result.state });
      io.to(currentRoomCode).emit('draft:pick:accepted', { pick: result.pick, state: result.state });
      io.to(currentRoomCode).emit('draft:state', result.state);
    }
  });

  socket.on('draft:rematch', (callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const result = RoomManager.resetMatch(currentRoomCode, currentPlayerId);
    if (result.error) {
      if (callback) callback({ success: false, error: result.error });
      return;
    }
    if (result.state) {
      if (callback) callback({ success: true, state: result.state });
      io.to(currentRoomCode).emit('draft:state', result.state);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomCode && currentPlayerId) {
      const room = RoomManager.getRoom(currentRoomCode);
      if (room) {
        const player = room.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.connected = false;
          io.to(currentRoomCode).emit('draft:state', room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Anime Arena Server] Running on http://localhost:${PORT}`);
});
