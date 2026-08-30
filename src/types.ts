export const ROLE_IDS = ["damage", "tank", "technical"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const RANK_CODES = [
  "C1",
  "C2",
  "C3",
  "C4",
  "B1",
  "B2",
  "B3",
  "B4",
  "A1",
  "A2",
  "A3",
  "A4",
  "S1",
  "S2",
  "S3",
  "S4",
] as const;
export type RankCode = (typeof RANK_CODES)[number];

export interface RankSnapshot {
  code: string;
  score: number;
  floor: number;
  ceiling: number;
  progress: number;
}

export interface MatchSnapshot {
  characterRankingId: string;
  characterName: string;
  outcome: string;
  gameType: string;
  teamFormat: string;
  playedAt: string;
  level: number | null;
  knockouts: number | null;
  assists: number | null;
  damage: number | null;
  durationSeconds: number | null;
  isMvp: boolean | null;
  rpChange: number | null;
  loadoutIds: string[];
}

export interface PlayerProfile {
  nickname: string;
  playerRank: RankSnapshot;
  votes: number | null;
  zeni: number | null;
  roleRanks: Record<RoleId, RankSnapshot>;
  matches: MatchSnapshot[];
  latestMatch: MatchSnapshot | null;
  lastSeenAt: string | null;
  starCollectionLevel: number | null;
}

export interface CharacterDefinition {
  rankingId: string;
  name: string;
  label: string;
  aliases?: string[];
  defaultRole: RoleId;
  assetKey?: string;
  portrait?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  effect: string;
  trigger: string | null;
  family: "offense" | "defense" | "utility";
  slot: 1 | 2 | 3;
  portrait: string;
  introducedSeason: string;
  retiredAfterSeason: string | null;
}

export interface SavedBuild {
  id: string;
  characterRankingId: string;
  name: string;
  cardIds: string[];
  helperId: string | null;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecommendedBuild {
  heroId: string;
  cardIds: string[];
  helperId: string | null;
  sourceUrl: string;
}

export interface CuratedBuild {
  id: string;
  characterRankingId: string;
  name: string;
  cardIds: string[];
  helperId: string | null;
  notes: string;
  why: string;
}

export interface AbilityReference {
  slot: string;
  key: string;
  name: string;
  description: string;
}

export interface GuideChoice {
  id: string;
  note: string | null;
}

export interface SkillOrderRow {
  skill: string;
  levels: number[];
}

export interface ExpandedBuildGuide {
  sourceUrl: string;
  explanation: string | null;
  situationalCards: GuideChoice[];
  situationalHelpers: GuideChoice[];
  skillOrder: SkillOrderRow[];
  recommendedCompHeroIds: string[];
  strongAgainstHeroIds: string[];
  weakAgainstHeroIds: string[];
}

export interface BuildGuideSource {
  sourceUrl: string;
  html: string;
}

export interface RoleGainHistory {
  damage: number[];
  tank: number[];
  technical: number[];
  lastScores: Record<RoleId, number> | null;
  lastMatchPlayedAt: string | null;
}

export interface MatchJournalEntry extends MatchSnapshot {
  id: string;
  seasonId: string;
  role: RoleId;
  observedAt: number;
}

export interface RankJournalEntry {
  seasonId: string;
  observedAt: number;
  matchPlayedAt: string | null;
  scores: Record<RoleId, number>;
  codes: Record<RoleId, string>;
}

export interface PlayerJournal {
  matches: MatchJournalEntry[];
  ranks: RankJournalEntry[];
}

export type JournalStore = Record<string, PlayerJournal>;

export interface HelperDefinition {
  id: string;
  name: string;
  label: string;
  role: RoleId;
  effect: string;
  assetKey?: string;
  portrait?: string;
}

export interface PresencePayload {
  details: string;
  state: string;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number;
}

export interface ProcessStatus {
  running: boolean;
  processName: string | null;
}

export interface DiscordStatus {
  connected: boolean;
  lastError: string | null;
  updatedAt: number | null;
}

export interface AppSettings {
  publicId: string;
  source: "tracker" | "manual";
  autoSync: boolean;
  onlyWhileGameRunning: boolean;
  presenceEnabled: boolean;
  autoPresenceWithGame: boolean;
  launchAtLogin: boolean;
  characterRankingId: string;
  role: RoleId;
  manualRank: RankCode;
  helperAssignments: Record<string, string>;
  processHints: string[];
  starCollectionLevel: number;
  starCollectionMaxLevel: number;
  startupAnimation: boolean;
  startupSound: boolean;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number;
  autoCheckUpdates: boolean;
  skippedUpdateVersion: string | null;
  overlayEnabled: boolean;
}

export interface OverlaySnapshot {
  enabled: boolean;
  nickname: string;
  characterName: string;
  role: RoleId;
  rank: string;
  rankScore: number | null;
  rankFloor: number | null;
  rankCeiling: number | null;
  rankProgress: number;
  nextRank: string | null;
  wins: number;
  losses: number;
  rpDelta: number;
  sessionStartedAt: number;
  updatedAt: number;
}

export interface OverlayServerStatus {
  running: boolean;
  url: string;
  error: string | null;
}

export interface StarRewardOverride {
  level: number;
  reward: string;
}

export type StarRewardOverrides = Record<string, string>;

export type KazumaPickOverrides = Record<string, CuratedBuild>;

export interface UpdateMetadata {
  version: string;
  currentVersion: string;
  notes: string | null;
  date: string | null;
}

export type UpdateDownloadEvent =
  | { event: "started"; data: { contentLength: number | null } }
  | { event: "progress"; data: { chunkLength: number } }
  | { event: "finished" };
