import { describe, it, expect, beforeAll } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { RoomManager } from '../engine/RoomManager';
import { initDb } from '../db/schema';
import { seedCatalogue } from '../db/seed';
import { Player, Character, DraftState } from '@anime-arena/shared';

describe('Multiplayer Draft E2E Simulation', () => {
  let server: http.Server;
  let ioServer: Server;
  let clientA: Socket;
  let clientB: Socket;
  const PORT = 4055;

  beforeAll(async () => {
    initDb();
    seedCatalogue();

    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });

    ioServer.on('connection', (socket) => {
      let roomCode: string | null = null;
      let playerId: string | null = null;

      socket.on('room:create', ({ player, settings }, cb) => {
        const state = RoomManager.createRoom(player, settings);
        roomCode = state.roomCode;
        playerId = player.id;
        socket.join(state.roomCode);
        if (cb) cb({ success: true, roomCode: state.roomCode, state });
        ioServer.to(state.roomCode).emit('draft:state', state);
      });

      socket.on('room:join', ({ roomCode: code, player }, cb) => {
        const res = RoomManager.joinRoom(code, player);
        if (res.error) {
          if (cb) cb({ success: false, error: res.error });
          return;
        }
        roomCode = res.state!.roomCode;
        playerId = player.id;
        socket.join(roomCode);
        if (cb) cb({ success: true, state: res.state });
        ioServer.to(roomCode).emit('draft:state', res.state);
      });

      socket.on('draft:start', (cb) => {
        const res = RoomManager.startGame(roomCode!, playerId!);
        if (cb) cb(res);
        if (res.state) ioServer.to(roomCode!).emit('draft:state', res.state);
      });

      socket.on('draft:pick', ({ character }, cb) => {
        const res = RoomManager.makePick(roomCode!, playerId!, character);
        if (cb) cb(res);
        if (res.state) ioServer.to(roomCode!).emit('draft:state', res.state);
      });
    });

    await new Promise<void>((resolve) => server.listen(PORT, resolve));

    clientA = Client(`http://localhost:${PORT}`);
    clientB = Client(`http://localhost:${PORT}`);

    await Promise.all([
      new Promise<void>((resolve) => clientA.on('connect', () => resolve())),
      new Promise<void>((resolve) => clientB.on('connect', () => resolve()))
    ]);
  });

  it('runs complete 2-player cross-verse draft with snake turn order', async () => {
    const playerA: Player = {
      id: 'p_alpha',
      name: 'Player Alpha',
      avatar: '1',
      isHost: true,
      isReady: true,
      connected: true,
      joinedAt: 1
    };

    const playerB: Player = {
      id: 'p_beta',
      name: 'Player Beta',
      avatar: '2',
      isHost: false,
      isReady: true,
      connected: true,
      joinedAt: 2
    };

    // Step 1: Player A creates room
    const createRes: any = await new Promise((resolve) => {
      clientA.emit('room:create', { player: playerA, settings: { rounds: 2, turnOrder: 'SNAKE' } }, resolve);
    });
    expect(createRes.success).toBe(true);
    const roomCode = createRes.roomCode;

    // Step 2: Player B joins room
    const joinRes: any = await new Promise((resolve) => {
      clientB.emit('room:join', { roomCode, player: playerB }, resolve);
    });
    expect(joinRes.success).toBe(true);

    // Step 3: Player A starts draft
    const startRes: any = await new Promise((resolve) => {
      clientA.emit('draft:start', resolve);
    });
    expect(startRes.state.phase).toBe('ACTIVE_DRAFT');
    expect(startRes.state.currentTurnPlayerId).toBe('p_alpha');

    // Available characters
    const available = RoomManager.getAvailableCharacters(roomCode);
    const goku = available.find(c => c.canonicalId === 'goku')!;
    const naruto = available.find(c => c.canonicalId === 'naruto')!;
    const luffy = available.find(c => c.canonicalId === 'luffy')!;
    const gojo = available.find(c => c.canonicalId === 'gojo')!;

    // Turn 1: Round 1, Player A picks Goku (Dragon Ball)
    const pick1: any = await new Promise((resolve) => {
      clientA.emit('draft:pick', { character: goku }, resolve);
    });
    expect(pick1.pick.character.canonicalId).toBe('goku');
    expect(pick1.state.currentTurnPlayerId).toBe('p_beta');

    // Turn 2: Round 1, Player B picks Naruto (Naruto)
    const pick2: any = await new Promise((resolve) => {
      clientB.emit('draft:pick', { character: naruto }, resolve);
    });
    expect(pick2.pick.character.canonicalId).toBe('naruto');
    // Snake draft: round 2 reverses, so Player B picks again!
    expect(pick2.state.currentTurnPlayerId).toBe('p_beta');
    expect(pick2.state.currentRound).toBe(2);

    // Turn 3: Round 2, Player B picks Gojo (Jujutsu Kaisen)
    const pick3: any = await new Promise((resolve) => {
      clientB.emit('draft:pick', { character: gojo }, resolve);
    });
    expect(pick3.pick.character.canonicalId).toBe('gojo');
    expect(pick3.state.currentTurnPlayerId).toBe('p_alpha');

    // Turn 4: Round 2, Player A picks Luffy (One Piece)
    const pick4: any = await new Promise((resolve) => {
      clientA.emit('draft:pick', { character: luffy }, resolve);
    });
    expect(pick4.pick.character.canonicalId).toBe('luffy');
    expect(pick4.state.phase).toBe('COMPLETED');
    expect(pick4.state.picks.length).toBe(4);

    clientA.disconnect();
    clientB.disconnect();
    server.close();
  });
});
