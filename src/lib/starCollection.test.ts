import { describe, expect, it } from "vitest";
import {
  HERO_UNLOCK_POOLS,
  KNOWN_STAR_REWARDS,
  STAR_COLLECTION_MAX_LEVEL,
  heroUnlockTiersForReward,
  rewardForStarLevel,
  sanitizeStarRewardOverrides,
} from "./starCollection";

describe("Star Collection rewards", () => {
  it("bundles the complete current Level 1–255 roadmap and allows a local correction", () => {
    expect(KNOWN_STAR_REWARDS[10]).toBe("Helper: Nail");
    expect(KNOWN_STAR_REWARDS[255]).toBe("G-Capsule ×2");
    expect(Object.keys(KNOWN_STAR_REWARDS)).toHaveLength(STAR_COLLECTION_MAX_LEVEL);
    expect(Array.from({ length: STAR_COLLECTION_MAX_LEVEL }, (_, index) => rewardForStarLevel(index + 1, {})).every(Boolean)).toBe(true);
    expect(rewardForStarLevel(256, {})).toBeNull();
    expect(rewardForStarLevel(10, { "10": "My corrected reward" })).toBe("My corrected reward");
  });

  it("contains every supplied current-roster Hero Unlock pool", () => {
    expect(HERO_UNLOCK_POOLS.IV).toHaveLength(10);
    expect(HERO_UNLOCK_POOLS.III).toHaveLength(11);
    expect(HERO_UNLOCK_POOLS.II).toHaveLength(9);
    expect(HERO_UNLOCK_POOLS.I).toHaveLength(6);
    expect(HERO_UNLOCK_POOLS.I).toContain("Frieza (Fourth Form)");
    expect(heroUnlockTiersForReward(KNOWN_STAR_REWARDS[148] ?? null)).toEqual(["III", "IV"]);
  });

  it("sanitizes level keys and reward text", () => {
    expect(sanitizeStarRewardOverrides({ "3": "  Helper: Botamo ", "0": "bad", "256": "bad", "1000": "bad", nope: "bad" }))
      .toEqual({ "3": "Helper: Botamo" });
  });
});
