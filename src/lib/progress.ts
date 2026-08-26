import type { PlayerProfile, RankSnapshot, RoleGainHistory, RoleId } from "../types";
import { getCharacter } from "./characters";

const HISTORY_KEY = "squadra-presence.rank-gains.v1";
const MAX_SAMPLES = 8;

export const EMPTY_GAIN_HISTORY: RoleGainHistory = {
  damage: [],
  tank: [],
  technical: [],
  lastScores: null,
  lastMatchPlayedAt: null,
};

function sanitizeSamples(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry) && entry > 0 && entry <= 100)
    .slice(-MAX_SAMPLES);
}

export function sanitizeRoleGainHistory(value: unknown): RoleGainHistory {
  if (!value || typeof value !== "object") return { ...EMPTY_GAIN_HISTORY };
  const parsed = value as Partial<RoleGainHistory>;
  const scores = parsed.lastScores;
  const validScores = scores
    && typeof scores.damage === "number"
    && typeof scores.tank === "number"
    && typeof scores.technical === "number";
  return {
    damage: sanitizeSamples(parsed.damage),
    tank: sanitizeSamples(parsed.tank),
    technical: sanitizeSamples(parsed.technical),
    lastScores: validScores ? { damage: scores.damage, tank: scores.tank, technical: scores.technical } : null,
    lastMatchPlayedAt: typeof parsed.lastMatchPlayedAt === "string" ? parsed.lastMatchPlayedAt : null,
  };
}

export function loadRankGainHistory(): RoleGainHistory {
  if (typeof window === "undefined") return EMPTY_GAIN_HISTORY;
  try {
    const saved = window.localStorage.getItem(HISTORY_KEY);
    if (!saved) return EMPTY_GAIN_HISTORY;
    return sanitizeRoleGainHistory(JSON.parse(saved));
  } catch {
    return EMPTY_GAIN_HISTORY;
  }
}

export function saveRankGainHistory(history: RoleGainHistory): void {
  if (typeof window !== "undefined") window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sanitizeRoleGainHistory(history)));
}

export function recordRankObservation(profile: PlayerProfile): RoleGainHistory {
  const current = loadRankGainHistory();
  const latest = profile.latestMatch;
  const next: RoleGainHistory = {
    ...current,
    damage: [...current.damage],
    tank: [...current.tank],
    technical: [...current.technical],
    lastScores: {
      damage: profile.roleRanks.damage.score,
      tank: profile.roleRanks.tank.score,
      technical: profile.roleRanks.technical.score,
    },
    lastMatchPlayedAt: latest?.playedAt || current.lastMatchPlayedAt,
  };

  if (
    latest?.playedAt &&
    latest.playedAt !== current.lastMatchPlayedAt &&
    current.lastScores &&
    /win|victory/i.test(latest.outcome)
  ) {
    const role = getCharacter(latest.characterRankingId, latest.characterName).defaultRole;
    const delta = profile.roleRanks[role].score - current.lastScores[role];
    if (delta > 0 && delta <= 100) next[role] = [...next[role], delta].slice(-MAX_SAMPLES);
  }

  saveRankGainHistory(next);
  return next;
}

export function rankPointsRemaining(snapshot: RankSnapshot): number {
  return Math.max(0, snapshot.ceiling - snapshot.score);
}

export function rankDivisionPoints(snapshot: RankSnapshot): { earned: number; total: number } {
  const total = Math.max(1, snapshot.ceiling - snapshot.floor);
  return {
    earned: Math.max(0, Math.min(total, snapshot.score - snapshot.floor)),
    total,
  };
}

export function averageWinGain(history: RoleGainHistory, role: RoleId): number | null {
  const samples = history[role];
  if (!samples.length) return null;
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

export function estimatedWinsRemaining(snapshot: RankSnapshot, history: RoleGainHistory, role: RoleId): number | null {
  const average = averageWinGain(history, role);
  const remaining = rankPointsRemaining(snapshot);
  if (!average || remaining <= 0) return null;
  return Math.max(1, Math.ceil(remaining / average));
}
