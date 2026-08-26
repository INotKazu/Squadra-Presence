import type { StarRewardOverrides } from "../types";

const STAR_REWARDS_KEY = "squadra-presence.star-reward-overrides.v1";

export const STAR_COLLECTION_MAX_LEVEL = 255;

export type HeroUnlockTier = "IV" | "III" | "II" | "I";

export const HERO_UNLOCK_POOLS: Readonly<Record<HeroUnlockTier, readonly string[]>> = {
  IV: [
    "Krillin", "Son Gohan (Kid)", "Dabura", "Majin Buu (Good)", "Zamasu",
    "Super Saiyan Kale (Berserk)", "Son Goku (Mini)", "Full Power Bojack", "Super Uub", "Super Saiyan 2 Caulifla",
  ],
  III: [
    "Frieza (First Form)", "Baby (Young Body)", "Super Saiyan Trunks (Teen)", "Android 17", "Cooler (Final Form)",
    "Gamma 1 & Gamma 2", "Android 18", "Cell (Perfect Form)", "Hit", "Super Saiyan 3 Son Goku", "God of Destruction Toppo",
  ],
  II: [
    "Super Saiyan Gotenks", "Super Saiyan 4 Vegeta", "Ultimate Gohan", "Legendary Super Saiyan Broly", "Super Vegito",
    "Super Saiyan Bardock", "Super Saiyan 2 Kefla", "Super Saiyan God Son Goku", "Majin Buu (Pure)",
  ],
  I: [
    "Super Saiyan God Vegeta", "Frieza (Fourth Form)", "Son Goku (Youth)", "Bulma (Youth)", "Beerus", "Goku Black",
  ],
};

const HERO_UNLOCK_LEVELS: Readonly<Record<string, readonly number[]>> = {
  IV: [1, 2, 4, 5, 9, 18, 26, 49, 69],
  III: [7, 15, 22, 42, 99, 129],
  II: [12, 36, 59, 89, 139, 163, 181, 214, 230],
  I: [31, 75, 109, 119, 190, 245],
  "III–IV": [148, 172, 198, 206, 222, 237, 253],
};

function buildStarRewards(): Readonly<Record<number, string>> {
  const rewards: Record<number, string> = Object.fromEntries(
    Array.from({ length: STAR_COLLECTION_MAX_LEVEL }, (_, index) => [index + 1, "G-Capsule ×2"]),
  );
  const set = (levels: readonly number[], reward: string) => levels.forEach((level) => { rewards[level] = reward; });

  Object.entries(HERO_UNLOCK_LEVELS).forEach(([tier, levels]) => set(levels, `Hero Unlock ${tier}`));
  const helpers: Readonly<Record<number, string>> = {
    3: "Helper: Botamo",
    6: "Helper: Hire Dragon",
    8: "Helper: Farmer",
    10: "Helper: Nail",
    11: "Helper: Hyper Mega Rildo",
    13: "Helper: Shu",
  };
  Object.entries(helpers).forEach(([level, reward]) => { rewards[Number(level)] = reward; });

  set([14, 20, 28, 33, 38, 46, 54, 64, 74, 84, 94, 104, 114], "Super G-Capsule ×1");
  set([122, 132, 142, 151, 162, 175, 184, 193, 201, 209, 217, 225, 233, 240, 248], "Super G-Capsule ×3");
  set([128, 138, 147, 157, 171, 180, 189, 197, 205, 213, 221, 229, 236, 244, 252], "G-Capsule ×5");
  set([
    17, 21, 25, 30, 35, 40, 44, 47, 52, 56, 62, 66, 72, 76, 82, 86, 92, 96, 102, 106, 112, 116,
    126, 136, 145, 155, 159, 169, 178, 187, 196, 204, 212, 220, 228, 235, 243, 251,
  ], "Emote: Dragon Ball Acquired");

  return Object.freeze(rewards);
}

// Transcribed from the current in-game Star Collection roadmap supplied with v0.6.1.
export const KNOWN_STAR_REWARDS = buildStarRewards();

export function heroUnlockTiersForReward(reward: string | null): HeroUnlockTier[] {
  if (!reward?.startsWith("Hero Unlock ")) return [];
  const tier = reward.slice("Hero Unlock ".length);
  if (tier === "III–IV" || tier === "III-IV") return ["III", "IV"];
  return (["IV", "III", "II", "I"] as HeroUnlockTier[]).includes(tier as HeroUnlockTier)
    ? [tier as HeroUnlockTier]
    : [];
}

export function sanitizeStarRewardOverrides(value: unknown): StarRewardOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const overrides: StarRewardOverrides = {};
  for (const [level, reward] of Object.entries(value)) {
    const numericLevel = Number(level);
    if (!Number.isInteger(numericLevel) || numericLevel < 1 || numericLevel > STAR_COLLECTION_MAX_LEVEL) continue;
    if (typeof reward !== "string" || !reward.trim()) continue;
    overrides[String(numericLevel)] = reward.trim().slice(0, 120);
  }
  return overrides;
}

export function loadStarRewardOverrides(): StarRewardOverrides {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(STAR_REWARDS_KEY);
    return value ? sanitizeStarRewardOverrides(JSON.parse(value)) : {};
  } catch {
    return {};
  }
}

export function saveStarRewardOverrides(overrides: StarRewardOverrides): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STAR_REWARDS_KEY, JSON.stringify(sanitizeStarRewardOverrides(overrides)));
  }
}

export function rewardForStarLevel(level: number, overrides: StarRewardOverrides): string | null {
  return overrides[String(level)] ?? KNOWN_STAR_REWARDS[level] ?? null;
}
