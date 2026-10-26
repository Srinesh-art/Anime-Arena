import { z } from 'zod';

export const RoomCodeSchema = z.string().trim().toUpperCase().min(4).max(10);

export const DraftModeSchema = z.enum([
  'CLASSIC',
  'CROSS_VERSE',
  'ANIME_LOCKED',
  'RANDOM_UNIVERSE',
  'SNAKE',
  'CUSTOM'
]);
export type DraftMode = z.infer<typeof DraftModeSchema>;

export const TurnOrderSchema = z.enum(['SNAKE', 'SEQUENTIAL']);
export type TurnOrder = z.infer<typeof TurnOrderSchema>;

export const IdentityPolicySchema = z.enum(['CANONICAL_ONLY', 'FORM_SPECIFIC']);
export type IdentityPolicy = z.infer<typeof IdentityPolicySchema>;

export const RoomSettingsSchema = z.object({
  roomName: z.string().min(1).max(50).default('Anime Arena Lobby'),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxPlayers: z.number().int().min(2).max(16).default(6),
  minPlayers: z.number().int().min(2).max(16).default(2),
  rounds: z.number().int().min(1).max(20).default(5),
  turnDuration: z.number().int().min(5).max(120).default(30), // seconds
  turnOrder: TurnOrderSchema.default('SNAKE'),
  draftMode: DraftModeSchema.default('CROSS_VERSE'),
  identityPolicy: IdentityPolicySchema.default('CANONICAL_ONLY'),
  eligibleFranchises: z.array(z.string()).default([]), // empty = all
  autoPickOnTimeout: z.boolean().default(true),
  allowLateJoins: z.boolean().default(false),
  teamsVisibleDuringDraft: z.boolean().default(true)
});
export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

export const DraftPhaseSchema = z.enum([
  'LOBBY',
  'STARTING',
  'ACTIVE_DRAFT',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
]);
export type DraftPhase = z.infer<typeof DraftPhaseSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  avatar: z.string(),
  isHost: z.boolean().default(false),
  isReady: z.boolean().default(false),
  connected: z.boolean().default(true),
  joinedAt: z.number()
});
export type Player = z.infer<typeof PlayerSchema>;

export const AnimeSchema = z.object({
  id: z.string(),
  franchiseId: z.string(),
  canonicalTitle: z.string(),
  englishTitle: z.string().optional(),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  genre: z.array(z.string()).default([])
});
export type Anime = z.infer<typeof AnimeSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  canonicalId: z.string(),
  animeId: z.string(),
  franchise: z.string(),
  name: z.string(),
  originalName: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  form: z.string().default('Base'),
  imageUrl: z.string(),
  role: z.string().optional(),
  description: z.string().optional()
});
export type Character = z.infer<typeof CharacterSchema>;

export const DraftPickSchema = z.object({
  pickNumber: z.number().int(),
  round: z.number().int(),
  playerId: z.string(),
  playerName: z.string(),
  character: CharacterSchema,
  pickedAt: z.number()
});
export type DraftPick = z.infer<typeof DraftPickSchema>;

export const DraftStateSchema = z.object({
  roomCode: z.string(),
  phase: DraftPhaseSchema,
  settings: RoomSettingsSchema,
  players: z.array(PlayerSchema),
  currentRound: z.number().int().default(1),
  currentPickIndex: z.number().int().default(0), // 0-based overall pick index
  currentTurnPlayerId: z.string().nullable().default(null),
  turnDeadline: z.number().nullable().default(null),
  picks: z.array(DraftPickSchema).default([]),
  turnOrderPlayerIds: z.array(z.string()).default([])
});
export type DraftState = z.infer<typeof DraftStateSchema>;
