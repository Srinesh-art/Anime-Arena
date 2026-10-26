import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { DraftState, Player, Character, RoomSettings } from '@anime-arena/shared';

describe('GameEngine', () => {
  const players: Player[] = [
    { id: 'p1', name: 'GokuFan', avatar: '1', isHost: true, isReady: true, connected: true, joinedAt: 1 },
    { id: 'p2', name: 'NarutoFan', avatar: '2', isHost: false, isReady: true, connected: true, joinedAt: 2 },
    { id: 'p3', name: 'LuffyFan', avatar: '3', isHost: false, isReady: true, connected: true, joinedAt: 3 }
  ];

  it('generates correct snake draft turn sequence', () => {
    // 3 players, 3 rounds
    // Round 1: p1 -> p2 -> p3
    // Round 2: p3 -> p2 -> p1
    // Round 3: p1 -> p2 -> p3
    const sequence = GameEngine.generateTurnSequence(players, 3, 'SNAKE');
    expect(sequence).toEqual([
      'p1', 'p2', 'p3', // R1
      'p3', 'p2', 'p1', // R2
      'p1', 'p2', 'p3'  // R3
    ]);
  });

  it('generates correct sequential draft turn sequence', () => {
    const sequence = GameEngine.generateTurnSequence(players, 2, 'SEQUENTIAL');
    expect(sequence).toEqual([
      'p1', 'p2', 'p3',
      'p1', 'p2', 'p3'
    ]);
  });

  const baseSettings: RoomSettings = {
    roomName: 'Test Room',
    isPrivate: false,
    maxPlayers: 4,
    minPlayers: 2,
    rounds: 2,
    turnDuration: 30,
    turnOrder: 'SNAKE',
    draftMode: 'CROSS_VERSE',
    identityPolicy: 'CANONICAL_ONLY',
    eligibleFranchises: [],
    autoPickOnTimeout: true,
    allowLateJoins: false,
    teamsVisibleDuringDraft: true
  };

  const charGoku1: Character = {
    id: 'goku_base',
    canonicalId: 'goku',
    animeId: 'dbz',
    franchise: 'Dragon Ball',
    name: 'Son Goku',
    form: 'Base',
    imageUrl: 'http://img/goku.jpg',
    aliases: ['Kakarot']
  };

  const charGoku2: Character = {
    id: 'goku_ssj',
    canonicalId: 'goku',
    animeId: 'dbz',
    franchise: 'Dragon Ball',
    name: 'Son Goku',
    form: 'Super Saiyan',
    imageUrl: 'http://img/goku_ssj.jpg',
    aliases: ['Kakarot']
  };

  const charNaruto: Character = {
    id: 'naruto_sage',
    canonicalId: 'naruto',
    animeId: 'naruto_shippuden',
    franchise: 'Naruto',
    name: 'Naruto Uzumaki',
    form: 'Sage Mode',
    imageUrl: 'http://img/naruto.jpg',
    aliases: []
  };

  it('enforces canonical identity policy (rejects different forms of drafted character)', () => {
    const state: DraftState = {
      roomCode: 'TEST',
      phase: 'ACTIVE_DRAFT',
      settings: { ...baseSettings, identityPolicy: 'CANONICAL_ONLY' },
      players,
      currentRound: 1,
      currentPickIndex: 1,
      currentTurnPlayerId: 'p2',
      turnDeadline: Date.now() + 30000,
      picks: [
        {
          pickNumber: 1,
          round: 1,
          playerId: 'p1',
          playerName: 'GokuFan',
          character: charGoku1,
          pickedAt: Date.now()
        }
      ],
      turnOrderPlayerIds: ['p1', 'p2', 'p3']
    };

    // p2 attempts to pick Goku in SSJ form
    const validation = GameEngine.validatePick(state, 'p2', charGoku2);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('canonical identity');

    // p2 picks Naruto instead (valid)
    const validValidation = GameEngine.validatePick(state, 'p2', charNaruto);
    expect(validValidation.valid).toBe(true);
  });

  it('allows different forms when FORM_SPECIFIC identity policy is configured', () => {
    const state: DraftState = {
      roomCode: 'TEST',
      phase: 'ACTIVE_DRAFT',
      settings: { ...baseSettings, identityPolicy: 'FORM_SPECIFIC' },
      players,
      currentRound: 1,
      currentPickIndex: 1,
      currentTurnPlayerId: 'p2',
      turnDeadline: Date.now() + 30000,
      picks: [
        {
          pickNumber: 1,
          round: 1,
          playerId: 'p1',
          playerName: 'GokuFan',
          character: charGoku1,
          pickedAt: Date.now()
        }
      ],
      turnOrderPlayerIds: ['p1', 'p2', 'p3']
    };

    // Under FORM_SPECIFIC, SSJ Goku has a different ID and is allowed
    const validation = GameEngine.validatePick(state, 'p2', charGoku2);
    expect(validation.valid).toBe(true);
  });
});
