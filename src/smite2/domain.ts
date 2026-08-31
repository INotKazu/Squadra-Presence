import type { Smite2SourceId } from "./sources";

export const SMITE2_ROLES = ["carry", "support", "mid", "jungle", "solo"] as const;
export type Smite2Role = (typeof SMITE2_ROLES)[number];

export const SMITE2_GAME_MODES = [
  "conquest",
  "arena",
  "assault",
  "joust",
  "duel",
  "other",
] as const;
export type Smite2GameMode = (typeof SMITE2_GAME_MODES)[number];

export const SMITE2_PLATFORMS = [
  "steam",
  "xbox",
  "playstation",
  "epic",
  "switch",
  "unknown",
] as const;
export type Smite2Platform = (typeof SMITE2_PLATFORMS)[number];

export interface Smite2God {
  slug: string;
  name: string;
  title: string | null;
  roles: Smite2Role[];
  portraitUrl: string | null;
}

export interface Smite2Item {
  slug: string;
  name: string;
  iconUrl: string | null;
  cost: number | null;
}

export type Smite2BuildSlot = "starter" | "relic" | "consumable" | "final";

export interface Smite2BuildItem {
  itemSlug: string;
  name: string;
  quantity: number;
  slot: Smite2BuildSlot;
}

export interface Smite2BuildRecommendation {
  id: string;
  source: Smite2SourceId;
  sourceUrl: string;
  godSlug: string;
  title: string;
  author: string | null;
  role: Smite2Role | null;
  mode: Smite2GameMode | null;
  patch: string | null;
  aspect: string | null;
  winRate: number | null;
  matchedGames: number | null;
  startingItems: Smite2BuildItem[];
  finalItems: Smite2BuildItem[];
  relics: Smite2BuildItem[];
}

export interface Smite2RankSnapshot {
  tier: string;
  division: number | null;
  skillRating: number | null;
  leaderboardPosition: number | null;
}

export interface Smite2MatchSnapshot {
  matchId: string;
  playedAt: string;
  godSlug: string;
  role: Smite2Role | null;
  mode: Smite2GameMode;
  outcome: "win" | "loss" | "unknown";
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  damage: number | null;
  mitigated: number | null;
  healing: number | null;
  gold: number | null;
  durationSeconds: number | null;
  skillRatingChange: number | null;
  items: Smite2BuildItem[];
}

export interface Smite2PlayerProfile {
  playerName: string;
  platform: Smite2Platform;
  rank: Smite2RankSnapshot;
  wins: number | null;
  losses: number | null;
  matches: Smite2MatchSnapshot[];
  lastUpdatedAt: string | null;
  source: "smitesource";
}
