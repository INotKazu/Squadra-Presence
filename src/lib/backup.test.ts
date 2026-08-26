import { describe, expect, it } from "vitest";
import { parseAppBackup } from "./backup";
import { DEFAULT_SETTINGS } from "./storage";

describe("app backup", () => {
  it("validates and sanitizes a supported backup", () => {
    const parsed = parseAppBackup(JSON.stringify({
      format: "squadra-presence-backup",
      version: 1,
      exportedAt: "2026-08-24T00:00:00.000Z",
      settings: DEFAULT_SETTINGS,
      savedBuilds: [],
      rankGainHistory: {},
      journals: {},
    }));
    expect(parsed.settings.publicId).toBe("");
    expect(parsed.savedBuilds).toEqual([]);
    expect(parsed.journals).toEqual({});
    expect(parsed.version).toBe(3);
    expect(parsed.kazumaPickOverrides).toEqual({});
    expect(parsed.starRewardOverrides).toEqual({});
  });

  it("keeps version 1 backups upgrade-compatible", () => {
    const parsed = parseAppBackup(JSON.stringify({
      format: "squadra-presence-backup",
      version: 1,
      settings: DEFAULT_SETTINGS,
      savedBuilds: [],
      rankGainHistory: {},
      journals: {},
    }));
    expect(parsed.version).toBe(3);
    expect(parsed.kazumaPickOverrides).toEqual({});
  });

  it("rejects unknown or malformed backups", () => {
    expect(() => parseAppBackup("not-json")).toThrow(/JSON/);
    expect(() => parseAppBackup(JSON.stringify({ format: "other", version: 1 }))).toThrow(/not supported/);
  });
});
