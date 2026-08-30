import { describe, expect, it } from "vitest";
import type { CloudBackupPayload } from "./cloudPayload";
import {
  comparableCloudBackupText,
  mergePortableSettings,
  parseCloudBackup,
  portableSettingsFrom,
} from "./cloudPayload";
import { DEFAULT_SETTINGS } from "./storage";

function cloudPayload(exportedAt: string): CloudBackupPayload {
  return {
    format: "squadra-cloud-vault",
    version: 1,
    exportedAt,
    settings: portableSettingsFrom({
      ...DEFAULT_SETTINGS,
      publicId: "12345678-1234-1234-1234-123456789abc",
      characterRankingId: "2735236247",
      role: "damage",
      manualRank: "A4",
      starCollectionLevel: 77,
      backgroundMusicEnabled: true,
      backgroundMusicVolume: 0.61,
    }),
    savedBuilds: [],
    rankGainHistory: { damage: [], tank: [], technical: [], lastScores: null, lastMatchPlayedAt: null },
    journals: {},
    kazumaPickOverrides: {},
    starRewardOverrides: {},
  };
}

describe("portable cloud payload", () => {
  it("syncs portable data without overwriting PC-only behavior", () => {
    const current = {
      ...DEFAULT_SETTINGS,
      presenceEnabled: true,
      launchAtLogin: true,
      onlyWhileGameRunning: false,
      processHints: ["custom-game"],
      overlayEnabled: false,
      autoCheckUpdates: false,
    };
    const merged = mergePortableSettings(current, cloudPayload("2026-08-30T00:00:00.000Z").settings);
    expect(merged.publicId).toBe("12345678-1234-1234-1234-123456789abc");
    expect(merged.characterRankingId).toBe("2735236247");
    expect(merged.manualRank).toBe("A4");
    expect(merged.starCollectionLevel).toBe(77);
    expect(merged.backgroundMusicEnabled).toBe(true);
    expect(merged.backgroundMusicVolume).toBe(0.61);
    expect(merged.presenceEnabled).toBe(true);
    expect(merged.launchAtLogin).toBe(true);
    expect(merged.onlyWhileGameRunning).toBe(false);
    expect(merged.processHints).toEqual(["custom-game"]);
    expect(merged.overlayEnabled).toBe(false);
    expect(merged.autoCheckUpdates).toBe(false);
  });

  it("ignores export timestamps when detecting content changes", () => {
    const first = JSON.stringify(cloudPayload("2026-08-30T00:00:00.000Z"));
    const second = JSON.stringify(cloudPayload("2026-08-30T00:05:00.000Z"));
    expect(comparableCloudBackupText(first)).toBe(comparableCloudBackupText(second));
  });

  it("rejects unknown cloud formats", () => {
    expect(() => parseCloudBackup(JSON.stringify({ format: "other", version: 1 }))).toThrow(/not supported/i);
    expect(() => parseCloudBackup("not json")).toThrow(/valid JSON/i);
  });
});
