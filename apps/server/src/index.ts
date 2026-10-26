import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { db, initDb } from './db/schema';
import { seedCatalogue } from './db/seed';
import { RoomManager } from './engine/RoomManager';
import { Player, Character, RoomSettings } from '@anime-arena/shared';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize SQLite database and seed initial catalogue
initDb();
seedCatalogue();

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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

// Real-time Turn Timer Engine
setInterval(() => {
  // Check active rooms for timer expiry
  const now = Date.now();
  // Using RoomManager state
  // In a production server, active rooms can be traversed
}, 1000);

// Socket.IO Real-time Connection Handlers
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;

  socket.on('room:create', ({ player, settings }: { player: Player; settings: Partial<RoomSettings> }, callback) => {
    try {
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

  socket.on('room:join', ({ roomCode, player }: { roomCode: string; player: Player }, callback) => {
    try {
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

  socket.on('room:settings:update', ({ settings }: { settings: Partial<RoomSettings> }, callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const result = RoomManager.updateSettings(currentRoomCode, currentPlayerId, settings);
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

  socket.on('draft:pick', ({ character }: { character: Character }, callback) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const result = RoomManager.makePick(currentRoomCode, currentPlayerId, character);
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
