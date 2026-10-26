import {
  DraftState,
  Player,
  RoomSettings,
  Character,
  DraftPick,
  DraftStateSchema
} from '@anime-arena/shared';
import { GameEngine } from './GameEngine';
import { db } from '../db/schema';

export class RoomManager {
  private static rooms: Map<string, DraftState> = new Map();
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static socketToPlayer: Map<string, { roomCode: string; playerId: string }> = new Map();

  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public static createRoom(hostPlayer: Player, settings: Partial<RoomSettings>): DraftState {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const initialSettings: RoomSettings = {
      roomName: settings.roomName || 'Anime Arena Draft',
      isPrivate: settings.isPrivate ?? false,
      password: settings.password,
      maxPlayers: settings.maxPlayers || 6,
      minPlayers: settings.minPlayers || 2,
      rounds: settings.rounds || 5,
      turnDuration: settings.turnDuration || 30,
      turnOrder: settings.turnOrder || 'SNAKE',
      draftMode: settings.draftMode || 'CROSS_VERSE',
      identityPolicy: settings.identityPolicy || 'CANONICAL_ONLY',
      eligibleFranchises: settings.eligibleFranchises || [],
      autoPickOnTimeout: settings.autoPickOnTimeout ?? true,
      allowLateJoins: settings.allowLateJoins ?? false,
      teamsVisibleDuringDraft: settings.teamsVisibleDuringDraft ?? true
    };

    const state: DraftState = {
      roomCode: code,
      phase: 'LOBBY',
      settings: initialSettings,
      players: [{ ...hostPlayer, isHost: true, connected: true }],
      currentRound: 1,
      currentPickIndex: 0,
      currentTurnPlayerId: null,
      turnDeadline: null,
      picks: [],
      turnOrderPlayerIds: []
    };

    this.rooms.set(code, state);
    this.persistRoom(state);
    return state;
  }

  public static getRoom(code: string): DraftState | undefined {
    const normalized = code.trim().toUpperCase();
    return this.rooms.get(normalized);
  }

  public static joinRoom(code: string, player: Player): { state?: DraftState; error?: string } {
    const state = this.getRoom(code);
    if (!state) return { error: 'Room does not exist' };

    // Check if player is already in room (reconnect)
    const existingIndex = state.players.findIndex(p => p.id === player.id);
    if (existingIndex !== -1) {
      state.players[existingIndex].connected = true;
      this.persistRoom(state);
      return { state };
    }

    if (state.phase !== 'LOBBY' && !state.settings.allowLateJoins) {
      return { error: 'Game has already started' };
    }

    if (state.players.length >= state.settings.maxPlayers) {
      return { error: 'Room is full' };
    }

    state.players.push({ ...player, isHost: false, connected: true });
    this.persistRoom(state);
    return { state };
  }

  public static leaveRoom(code: string, playerId: string): { state?: DraftState; closed?: boolean } {
    const state = this.getRoom(code);
    if (!state) return { closed: true };

    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { state };

    const wasHost = state.players[playerIndex].isHost;
    state.players.splice(playerIndex, 1);

    if (state.players.length === 0) {
      this.rooms.delete(code);
      this.clearRoomTimer(code);
      return { closed: true };
    }

    // Pass host if host left
    if (wasHost && state.players.length > 0) {
      state.players[0].isHost = true;
    }

    this.persistRoom(state);
    return { state };
  }

  public static setReady(code: string, playerId: string, isReady: boolean): DraftState | undefined {
    const state = this.getRoom(code);
    if (!state) return undefined;

    const player = state.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = isReady;
      this.persistRoom(state);
    }
    return state;
  }

  public static updateSettings(code: string, hostPlayerId: string, settings: Partial<RoomSettings>): { state?: DraftState; error?: string } {
    const state = this.getRoom(code);
    if (!state) return { error: 'Room not found' };

    const host = state.players.find(p => p.id === hostPlayerId);
    if (!host || !host.isHost) {
      return { error: 'Only the host can modify game settings' };
    }

    if (state.phase !== 'LOBBY') {
      return { error: 'Settings cannot be updated after draft begins' };
    }

    state.settings = { ...state.settings, ...settings };
    this.persistRoom(state);
    return { state };
  }

  public static startGame(code: string, hostPlayerId: string): { state?: DraftState; error?: string } {
    const state = this.getRoom(code);
    if (!state) return { error: 'Room not found' };

    const host = state.players.find(p => p.id === hostPlayerId);
    if (!host || !host.isHost) {
      return { error: 'Only the host can start the game' };
    }

    if (state.players.length < state.settings.minPlayers) {
      return { error: `At least ${state.settings.minPlayers} players are required to start` };
    }

    const turnSequence = GameEngine.generateTurnSequence(
      state.players,
      state.settings.rounds,
      state.settings.turnOrder
    );

    state.phase = 'ACTIVE_DRAFT';
    state.turnOrderPlayerIds = turnSequence;
    state.currentPickIndex = 0;
    state.currentRound = 1;
    state.currentTurnPlayerId = turnSequence[0];
    state.turnDeadline = Date.now() + state.settings.turnDuration * 1000;

    this.persistRoom(state);
    return { state };
  }

  public static makePick(
    code: string,
    playerId: string,
    character: Character
  ): { state?: DraftState; pick?: DraftPick; error?: string } {
    const state = this.getRoom(code);
    if (!state) return { error: 'Room not found' };

    // Never trust client-supplied character attributes. Resolve the canonical record from SQLite.
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(character?.id) as any;
    if (!row) return { error: 'Character does not exist in the catalogue' };
    const canonicalCharacter: Character = {
      id: row.id,
      canonicalId: row.canonical_id,
      animeId: row.anime_id,
      franchise: row.franchise,
      name: row.name,
      originalName: row.original_name,
      aliases: JSON.parse(row.aliases || '[]'),
      form: row.form || 'Base',
      imageUrl: row.image_url || '',
      role: row.role || undefined,
      description: row.description || undefined
    };

    const validation = GameEngine.validatePick(state, playerId, canonicalCharacter);
    if (!validation.valid) {
      return { error: validation.reason || 'Invalid pick' };
    }

    const { nextState, pick } = GameEngine.applyPick(state, playerId, canonicalCharacter);
    this.rooms.set(code, nextState);
    this.persistRoom(nextState);

    return { state: nextState, pick };
  }

  public static getAvailableCharacters(code: string): Character[] {
    const state = this.getRoom(code);
    const rows = db.prepare('SELECT * FROM characters').all() as any[];
    const allChars: Character[] = rows.map(r => ({
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

    if (!state) return allChars;

    // Filter by franchise if configured
    let filtered = allChars;
    if (state.settings.eligibleFranchises && state.settings.eligibleFranchises.length > 0) {
      filtered = filtered.filter(c => state.settings.eligibleFranchises.includes(c.franchise));
    }

    // Filter drafted characters
    if (state.settings.identityPolicy === 'CANONICAL_ONLY') {
      const draftedCanonicalIds = new Set(state.picks.map(p => p.character.canonicalId));
      return filtered.filter(c => !draftedCanonicalIds.has(c.canonicalId));
    } else {
      const draftedIds = new Set(state.picks.map(p => p.character.id));
      return filtered.filter(c => !draftedIds.has(c.id));
    }
  }

  public static restoreRooms(): number {
    this.rooms.clear();
    const rows = db.prepare('SELECT state_json FROM rooms ORDER BY updated_at DESC').all() as Array<{ state_json: string }>;
    let restored = 0;
    for (const row of rows) {
      try {
        const parsed = DraftStateSchema.safeParse(JSON.parse(row.state_json));
        if (!parsed.success) {
          console.warn('[RoomManager] Skipping invalid persisted room state.');
          continue;
        }
        const state = parsed.data;
        for (const player of state.players) player.connected = false;
        if (state.phase === 'ACTIVE_DRAFT' && state.currentTurnPlayerId) {
          state.turnDeadline = Date.now() + state.settings.turnDuration * 1000;
        }
        this.rooms.set(state.roomCode, state);
        this.persistRoom(state);
        restored++;
      } catch (error) {
        console.error('[RoomManager] Could not restore persisted room:', error);
      }
    }
    console.log('[RoomManager] Restored ' + restored + ' persisted rooms.');
    return restored;
  }

  public static processExpiredTurns(): Array<{ state: DraftState; pick?: DraftPick }> {
    const results: Array<{ state: DraftState; pick?: DraftPick }> = [];
    const now = Date.now();
    for (const state of this.rooms.values()) {
      if (state.phase !== 'ACTIVE_DRAFT' || state.turnDeadline === null || state.turnDeadline > now) continue;
      if (!state.settings.autoPickOnTimeout) {
        state.turnDeadline = now + state.settings.turnDuration * 1000;
        this.persistRoom(state);
        results.push({ state });
        continue;
      }
      const result = this.autoPick(state.roomCode);
      if (result.state) results.push({ state: result.state, pick: result.pick });
    }
    return results;
  }

  public static autoPick(code: string): { state?: DraftState; pick?: DraftPick } {
    const state = this.getRoom(code);
    if (!state || state.phase !== 'ACTIVE_DRAFT' || !state.currentTurnPlayerId) {
      return {};
    }

    const available = this.getAvailableCharacters(code);
    if (available.length === 0) {
      // No more characters available, complete draft
      state.phase = 'COMPLETED';
      state.currentTurnPlayerId = null;
      this.persistRoom(state);
      return { state };
    }

    // Pick random available character
    const randomChar = available[Math.floor(Math.random() * available.length)];
    return this.makePick(code, state.currentTurnPlayerId, randomChar);
  }

  public static resetMatch(code: string, hostPlayerId: string): { state?: DraftState; error?: string } {
    const state = this.getRoom(code);
    if (!state) return { error: 'Room not found' };

    const host = state.players.find(p => p.id === hostPlayerId);
    if (!host || !host.isHost) {
      return { error: 'Only the host can rematch' };
    }

    state.phase = 'LOBBY';
    state.picks = [];
    state.currentRound = 1;
    state.currentPickIndex = 0;
    state.currentTurnPlayerId = null;
    state.turnDeadline = null;
    state.turnOrderPlayerIds = [];

    this.persistRoom(state);
    return { state };
  }

  private static clearRoomTimer(code: string) {
    const timer = this.timers.get(code);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(code);
    }
  }

  private static persistRoom(state: DraftState) {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO rooms (code, name, host_id, settings, phase, state_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        state.roomCode,
        state.settings.roomName,
        state.players.find(p => p.isHost)?.id || 'unknown',
        JSON.stringify(state.settings),
        state.phase,
        JSON.stringify(state),
        Date.now(),
        Date.now()
      );
    } catch (e) {
      console.error('[RoomManager] Failed to persist room to SQLite:', e);
    }
  }
}
