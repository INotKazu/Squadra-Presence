import { describe, expect, it } from "vitest";
import { CHARACTERS, getCharacter, TRACKER_RANKING_ID_BY_ASSET_KEY } from "./characters";

describe("character roster", () => {
  it("contains all 40 current playable heroes with unique Discord asset keys", () => {
    expect(CHARACTERS).toHaveLength(40);
    expect(new Set(CHARACTERS.map((character) => character.assetKey)).size).toBe(40);
  });

  it("matches new tracker IDs by the official character name", () => {
    const character = getCharacter("new-dbgs-id", "Jiren (Full Power)");
    expect(character.assetKey).toBe("character_jiren_full_power");
    expect(character.defaultRole).toBe("tank");
  });

  it("supports common tracker name aliases", () => {
    expect(getCharacter("new-dbgs-id", "Kid Buu").assetKey).toBe("character_majin_buu_pure");
    expect(getCharacter("new-dbgs-id", "Gamma 1 and Gamma 2").assetKey).toBe("character_gamma_1_2");
  });

  it("resolves every published live tracker ranking ID", () => {
    expect(Object.keys(TRACKER_RANKING_ID_BY_ASSET_KEY)).toHaveLength(40);
    for (const character of CHARACTERS) {
      const liveId = TRACKER_RANKING_ID_BY_ASSET_KEY[character.assetKey ?? ""];
      expect(liveId).toBeTruthy();
      if (!liveId) throw new Error(`Missing live tracker ID for ${character.name}`);
      expect(getCharacter(liveId).assetKey).toBe(character.assetKey);
    }
    expect(getCharacter("3267382816").name).toBe("Hit");
    expect(getCharacter("2364114085").name).toBe("Piccolo");
    expect(getCharacter("1308549053").name).toBe("Majin Buu (Pure)");
    expect(getCharacter("2497566854").name).toBe("Frieza (Fourth Form)");
  });
});
