import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/storage";
import {
  DEFAULT_SMITE2_SETTINGS,
  SMITE2_STORAGE_KEYS,
  sanitizeSmite2Settings,
} from "./storage";

describe("SMITE 2 storage boundary", () => {
  it("uses keys that cannot collide with Squadra", () => {
    expect(Object.values(SMITE2_STORAGE_KEYS).every((key) => key.startsWith("kazucorp-smite2."))).toBe(true);
    expect(Object.values(SMITE2_STORAGE_KEYS)).not.toContain("squadra-presence.settings.v1");
  });

  it("does not inherit Squadra identity or gameplay settings", () => {
    const settings = sanitizeSmite2Settings(DEFAULT_SETTINGS);
    expect(settings).toEqual(DEFAULT_SMITE2_SETTINGS);
  });

  it("sanitizes identity, role, mode, platform, and god slug", () => {
    const settings = sanitizeSmite2Settings({
      playerName: `  ${"K".repeat(80)}  `,
      platform: "unknown-console",
      selectedGodSlug: "The Morrigan",
      defaultRole: "wizard",
      defaultMode: "ranked",
      autoSync: false,
    });
    expect(settings.playerName).toHaveLength(64);
    expect(settings.platform).toBe("steam");
    expect(settings.selectedGodSlug).toBe("the-morrigan");
    expect(settings.defaultRole).toBe("solo");
    expect(settings.defaultMode).toBe("conquest");
    expect(settings.autoSync).toBe(false);
  });
});
