import type { RankCode, RankSnapshot, RoleId } from "../types";

const ROLE_FLOORS = {
  C: 800,
  B: 1200,
  A: 1600,
  S: 2000,
} as const;

export function roleRankFromScore(score: number): RankSnapshot {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  let letter = "Unranked";
  let grade = "";
  let floor = 0;
  let ceiling = 800;

  if (safeScore >= ROLE_FLOORS.S) {
    letter = "S";
    const rawGrade = 4 - Math.floor((safeScore - ROLE_FLOORS.S) / 100);
    grade = String(Math.max(1, rawGrade));
    floor = ROLE_FLOORS.S + (4 - Number(grade)) * 100;
    ceiling = grade === "1" ? Math.max(floor + 100, safeScore + 1) : floor + 100;
  } else if (safeScore >= ROLE_FLOORS.A) {
    letter = "A";
    grade = String(4 - Math.floor((safeScore - ROLE_FLOORS.A) / 100));
    floor = ROLE_FLOORS.A + (4 - Number(grade)) * 100;
    ceiling = floor + 100;
  } else if (safeScore >= ROLE_FLOORS.B) {
    letter = "B";
    grade = String(4 - Math.floor((safeScore - ROLE_FLOORS.B) / 100));
    floor = ROLE_FLOORS.B + (4 - Number(grade)) * 100;
    ceiling = floor + 100;
  } else if (safeScore >= ROLE_FLOORS.C) {
    letter = "C";
    grade = String(4 - Math.floor((safeScore - ROLE_FLOORS.C) / 100));
    floor = ROLE_FLOORS.C + (4 - Number(grade)) * 100;
    ceiling = floor + 100;
  }

  const progress = ceiling > floor ? (safeScore - floor) / (ceiling - floor) : 0;
  return {
    code: `${letter}${grade}`,
    score: safeScore,
    floor,
    ceiling,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

export function normalizeRankCode(value: unknown, fallback = "C4"): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  return /^[SABC][1-4]$/.test(normalized) ? normalized : fallback;
}

export function hasRankAsset(code: string): code is RankCode {
  return /^[SABC][1-4]$/.test(code);
}

export function rankAssetPath(code: string): string | undefined {
  return hasRankAsset(code) ? `/assets/ranks/rank_${code.toLowerCase()}.png` : undefined;
}

export function rankAssetKey(code: string): string | undefined {
  return hasRankAsset(code) ? `rank_${code.toLowerCase()}` : undefined;
}

export function roleLabel(role: RoleId): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export const ORDERED_RANKS: RankCode[] = [
  "C4",
  "C3",
  "C2",
  "C1",
  "B4",
  "B3",
  "B2",
  "B1",
  "A4",
  "A3",
  "A2",
  "A1",
  "S4",
  "S3",
  "S2",
  "S1",
];

export function nextRankCode(code: string): RankCode | null {
  const index = ORDERED_RANKS.indexOf(code as RankCode);
  if (index < 0 || index >= ORDERED_RANKS.length - 1) return null;
  return ORDERED_RANKS[index + 1] ?? null;
}
