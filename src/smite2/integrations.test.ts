import { describe, expect, it } from "vitest";
import { buildSmite2Presence, buildSmite2Overlay, SMITE2_OBS_PORT, SMITE2_OBS_URL } from "./integrations";
import { DEFAULT_SMITE2_SETTINGS } from "./storage";

describe("SMITE 2 Discord and OBS integrations", () => {
  it("uses a dedicated OBS port", () => {
    expect(SMITE2_OBS_PORT).toBe(47_622);
    expect(SMITE2_OBS_PORT).not.toBe(47_612);
    expect(SMITE2_OBS_URL).toBe("http://127.0.0.1:47622/overlay");
  });

  it("builds SMITE-specific Discord presence without Squadra fields", () => {
    const payload = buildSmite2Presence({
      ...DEFAULT_SMITE2_SETTINGS,
      selectedGodSlug: "the-morrigan",
      defaultRole: "mid",
    }, 123);
    expect(payload.details).toBe("The Morrigan");
    expect(payload.state).toBe("Mid • Conquest");
    expect(payload.largeImageKey).toBe("smite2_companion");
    expect(JSON.stringify(payload)).not.toMatch(/squadra|bardock|rank_c3/iu);
  });

  it("builds a streaming snapshot from isolated settings", () => {
    const snapshot = buildSmite2Overlay({
      ...DEFAULT_SMITE2_SETTINGS,
      playerName: "Kazuma",
      selectedGodSlug: "hecate",
      overlayEnabled: true,
    }, 123, { wins: 2, losses: 1, kills: 8, deaths: 3, assists: 11 });
    expect(snapshot).toMatchObject({ playerName: "Kazuma", godName: "Hecate", wins: 2, losses: 1, kills: 8 });
  });
});
