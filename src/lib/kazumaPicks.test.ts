import { describe, expect, it } from "vitest";
import { getCard } from "./cards";
import { CHARACTERS } from "./characters";
import { getHelper } from "./helpers";
import { KAZUMA_PICKS, getKazumaPicks, sanitizeKazumaPickOverrides } from "./kazumaPicks";

describe("Kazuma's Picks", () => {
  it("ships the verified Bardock, Broly, and Goku Black presets", () => {
    expect(getKazumaPicks("3875954222")[0]?.cardIds).toEqual(["1-2-verde", "2-1-verde", "3-1-verde"]);
    expect(getKazumaPicks("2735236247")[0]?.cardIds).toEqual(["1-1-verde", "2-1-rossa", "3-1-verde"]);
    expect(getKazumaPicks("661292423")[0]?.cardIds).toEqual(["1-1-verde", "2-1-rossa", "3-1-verde"]);
  });

  it("contains valid cards and only role-compatible Helpers", () => {
    for (const build of KAZUMA_PICKS) {
      const fighter = CHARACTERS.find((character) => character.rankingId === build.characterRankingId);
      const cards = build.cardIds.map(getCard);
      expect(fighter).toBeTruthy();
      expect(cards.every(Boolean)).toBe(true);
      expect(new Set(cards.map((card) => card?.slot))).toEqual(new Set([1, 2, 3]));
      if (build.helperId) expect(getHelper(build.helperId)?.role).toBe(fighter?.defaultRole);
    }
  });

  it("allows valid local edits while rejecting incompatible overrides", () => {
    const base = KAZUMA_PICKS[0]!;
    const edited = { ...base, name: "My local title", why: "My updated note" };
    expect(getKazumaPicks(base.characterRankingId, sanitizeKazumaPickOverrides({ [base.id]: edited }))[0]?.name).toBe("My local title");
    expect(sanitizeKazumaPickOverrides({ [base.id]: { ...edited, helperId: "world_king" } })).toEqual({});
  });
});
