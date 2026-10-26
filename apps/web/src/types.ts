export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface RoomSettings {
  roomName: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  minPlayers: number;
  rounds: number;
  turnDuration: number;
  turnOrder: 'SNAKE' | 'SEQUENTIAL';
  draftMode: 'CLASSIC' | 'CROSS_VERSE' | 'ANIME_LOCKED' | 'RANDOM_UNIVERSE' | 'SNAKE' | 'CUSTOM';
  identityPolicy: 'CANONICAL_ONLY' | 'FORM_SPECIFIC';
  eligibleFranchises: string[];
  autoPickOnTimeout: boolean;
  allowLateJoins: boolean;
  teamsVisibleDuringDraft: boolean;
}

export interface Character {
  id: string;
  canonicalId: string;
  animeId: string;
  franchise: string;
  name: string;
  originalName?: string;
  aliases: string[];
  form: string;
  imageUrl: string;
  role?: string;
  description?: string;
}

export interface DraftPick {
  pickNumber: number;
  round: number;
  playerId: string;
  playerName: string;
  character: Character;
  pickedAt: number;
}

export interface DraftState {
  roomCode: string;
  phase: 'LOBBY' | 'STARTING' | 'ACTIVE_DRAFT' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  currentPickIndex: number;
  currentTurnPlayerId: string | null;
  turnDeadline: number | null;
  picks: DraftPick[];
  turnOrderPlayerIds: string[];
}
