import {
  DraftState,
  DraftPick,
  Player,
  Character,
  RoomSettings,
  TurnOrder
} from '@anime-arena/shared';

export class GameEngine {
  /**
   * Generates the draft turn sequence for all rounds.
   * Supports SNAKE draft (A->B->C, C->B->A, A->B->C) and SEQUENTIAL (A->B->C, A->B->C).
   */
  public static generateTurnSequence(players: Player[], rounds: number, order: TurnOrder): string[] {
    const sequence: string[] = [];
    const playerIds = players.map(p => p.id);

    if (playerIds.length === 0) return sequence;

    for (let round = 1; round <= rounds; round++) {
      if (order === 'SNAKE' && round % 2 === 0) {
        // Reverse for even rounds in snake draft
        for (let i = playerIds.length - 1; i >= 0; i--) {
          sequence.push(playerIds[i]);
        }
      } else {
        // Standard forward order
        for (let i = 0; i < playerIds.length; i++) {
          sequence.push(playerIds[i]);
        }
      }
    }

    return sequence;
  }

  /**
   * Validates if a character selection complies with the room's identity policy and franchise restrictions.
   */
  public static validatePick(
    state: DraftState,
    playerId: string,
    character: Character
  ): { valid: boolean; reason?: string } {
    if (state.phase !== 'ACTIVE_DRAFT') {
      return { valid: false, reason: 'Game is not in active draft phase' };
    }

    if (state.currentTurnPlayerId !== playerId) {
      return { valid: false, reason: 'It is not your turn' };
    }

    // Franchise eligibility check
    if (
      state.settings.eligibleFranchises &&
      state.settings.eligibleFranchises.length > 0 &&
      !state.settings.eligibleFranchises.includes(character.franchise)
    ) {
      return { valid: false, reason: `Franchise ${character.franchise} is not eligible in this draft` };
    }

    // Duplicate check based on identity policy
    if (state.settings.identityPolicy === 'CANONICAL_ONLY') {
      const alreadyPicked = state.picks.some(
        p => p.character.canonicalId === character.canonicalId
      );
      if (alreadyPicked) {
        return { valid: false, reason: `Character ${character.name} (canonical identity) has already been drafted` };
      }
    } else {
      // FORM_SPECIFIC: exact form cannot be drafted twice
      const alreadyPickedForm = state.picks.some(
        p => p.character.id === character.id
      );
      if (alreadyPickedForm) {
        return { valid: false, reason: `Form ${character.form} of ${character.name} has already been drafted` };
      }
    }

    return { valid: true };
  }

  /**
   * Applies a pick to the state atomically and calculates the next turn or completion.
   */
  public static applyPick(
    state: DraftState,
    playerId: string,
    character: Character
  ): { nextState: DraftState; pick: DraftPick } {
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found in match');

    const totalPicks = state.picks.length;
    const nextPickIndex = totalPicks + 1;
    const currentRound = Math.floor(totalPicks / state.players.length) + 1;

    const pick: DraftPick = {
      pickNumber: nextPickIndex,
      round: currentRound,
      playerId,
      playerName: player.name,
      character,
      pickedAt: Date.now()
    };

    const updatedPicks = [...state.picks, pick];
    const totalTurns = state.turnOrderPlayerIds.length;

    let nextPhase = state.phase;
    let nextPlayerId: string | null = null;
    let nextDeadline: number | null = null;
    let nextRoundNumber = currentRound;

    if (nextPickIndex >= totalTurns) {
      // All rounds completed!
      nextPhase = 'COMPLETED';
      nextPlayerId = null;
      nextDeadline = null;
    } else {
      nextPlayerId = state.turnOrderPlayerIds[nextPickIndex];
      nextRoundNumber = Math.floor(nextPickIndex / state.players.length) + 1;
      nextDeadline = Date.now() + state.settings.turnDuration * 1000;
    }

    const nextState: DraftState = {
      ...state,
      phase: nextPhase,
      currentRound: nextRoundNumber,
      currentPickIndex: nextPickIndex,
      currentTurnPlayerId: nextPlayerId,
      turnDeadline: nextDeadline,
      picks: updatedPicks
    };

    return { nextState, pick };
  }
}
