import { beforeAll, describe, expect, it } from 'vitest';
import { initDb } from '../db/schema';
import { seedCatalogue } from '../db/seed';
import { RoomManager } from '../engine/RoomManager';
import type { Player, RoomSettings, Character } from '@anime-arena/shared';

describe('RoomManager security and recovery', () => {
  beforeAll(() => { initDb(); seedCatalogue(); });

  const settings: Partial<RoomSettings> = { rounds: 2, minPlayers: 2, maxPlayers: 4, turnOrder: 'SNAKE' };
  const player = (id: string, isHost: boolean): Player => ({
    id, name: 'Player ' + id.slice(-6), avatar: 'guest', isHost, isReady: true, connected: true, joinedAt: Date.now()
  });

  it('never grants host privileges to a joining client', () => {
    const host = player('host-security-' + Math.random(), false);
    const room = RoomManager.createRoom(host, settings);
    expect(room.players[0].isHost).toBe(true);
    const attacker = player('attacker-security-' + Math.random(), true);
    const joined = RoomManager.joinRoom(room.roomCode, attacker);
    expect(joined.error).toBeUndefined();
    expect(joined.state?.players[1].isHost).toBe(false);
  });

  it('resolves picked character attributes from the canonical SQLite catalogue', () => {
    const host = player('host-canonical-' + Math.random(), false);
    const guest = player('guest-canonical-' + Math.random(), false);
    const room = RoomManager.createRoom(host, settings);
    RoomManager.joinRoom(room.roomCode, guest);
    const started = RoomManager.startGame(room.roomCode, host.id);
    expect(started.error).toBeUndefined();
    const forged = {
      id: 'goku_base', canonicalId: 'forged-canonical-id', animeId: 'fake-anime',
      franchise: 'Fake Franchise', name: 'Forged Character', form: 'Admin Form',
      imageUrl: 'https://attacker.invalid/image.png', aliases: []
    } as Character;
    const result = RoomManager.makePick(room.roomCode, host.id, forged);
    expect(result.error).toBeUndefined();
    expect(result.pick?.character.canonicalId).toBe('goku');
    expect(result.pick?.character.name).toBe('Son Goku');
    expect(result.pick?.character.franchise).toBe('Dragon Ball');
  });

  it('restores persisted rooms as disconnected and gives active turns a fresh deadline', () => {
    const host = player('host-restore-' + Math.random(), false);
    const guest = player('guest-restore-' + Math.random(), false);
    const room = RoomManager.createRoom(host, settings);
    RoomManager.joinRoom(room.roomCode, guest);
    RoomManager.startGame(room.roomCode, host.id);
    const count = RoomManager.restoreRooms();
    expect(count).toBeGreaterThan(0);
    const restored = RoomManager.getRoom(room.roomCode);
    expect(restored).toBeDefined();
    expect(restored?.players.every(p => p.connected === false)).toBe(true);
    expect(restored?.turnDeadline).toBeGreaterThan(Date.now());
  });
});
