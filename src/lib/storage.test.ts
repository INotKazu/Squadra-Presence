import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, sanitizeSettings } from "./storage";

describe("settings sanitization", () => {
  it("keeps fresh-install identity and startup settings distribution-safe", () => {
    expect(DEFAULT_SETTINGS.publicId).toBe("");
    expect(DEFAULT_SETTINGS.launchAtLogin).toBe(false);
    expect(DEFAULT_SETTINGS.starCollectionMaxLevel).toBe(255);
  });

  it("migrates old Star Collection settings to the current 255 cap", () => {
    const sanitized = sanitizeSettings({ ...DEFAULT_SETTINGS, starCollectionLevel: 999, starCollectionMaxLevel: 75 });
    expect(sanitized.starCollectionLevel).toBe(255);
    expect(sanitized.starCollectionMaxLevel).toBe(255);
  });

  it("drops unknown fighters and incompatible Helper assignments", () => {
    const sanitized = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      characterRankingId: "not-a-fighter",
      helperAssignments: {
        "3875954222": "world_king",
        "2735236247": "world_king",
      },
    });
    expect(sanitized.characterRankingId).toBe(DEFAULT_SETTINGS.characterRankingId);
    expect(sanitized.helperAssignments["3875954222"]).toBe("dende");
    expect(sanitized.helperAssignments["2735236247"]).toBe("world_king");
  });
});
