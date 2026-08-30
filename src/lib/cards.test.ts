import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CARDS, SEASON_7_NEW_CARDS, getCard, getCardsForSlot, isCurrentBuild } from "./cards";

describe("card catalog", () => {
  it("contains 18 active Season 7 choices while preserving the complete Season 6 catalog", () => {
    expect(CARDS).toHaveLength(30);
    expect(SEASON_7_NEW_CARDS).toHaveLength(12);
    expect(new Set(CARDS.map((card) => card.id)).size).toBe(30);
    expect(getCardsForSlot(1)).toHaveLength(6);
    expect(getCardsForSlot(2)).toHaveLength(6);
    expect(getCardsForSlot(3)).toHaveLength(6);
  });

  it("keeps retired cards readable without offering them in new builds", () => {
    expect(getCard("2-1-verde")?.name).toBe("Steel Skin");
    expect(getCard("2-1-verde")?.retiredAfterSeason).toBe("6");
    expect(getCardsForSlot(2).some((card) => card.id === "2-1-verde")).toBe(false);
    expect(isCurrentBuild(["1-1-verde", "2-1-rossa", "3-1-verde"])).toBe(true);
    expect(isCurrentBuild(["1-2-verde", "2-1-verde", "3-1-verde"])).toBe(false);
  });

  it("records the announced trigger and effect for every new card", () => {
    expect(SEASON_7_NEW_CARDS.every((card) => card.introducedSeason === "7" && card.trigger && card.effect)).toBe(true);
    expect(getCard("s7-2-blue-heal-block")?.effect).toContain("prevented from recovering");
    expect(getCard("s7-3-green-turtle-shell")?.effect).toContain("boosts maximum total HP");
  });

  it("ships a resolvable portrait view for every new card", () => {
    const publicRoot = fileURLToPath(new URL("../../public/", import.meta.url));
    for (const card of SEASON_7_NEW_CARDS) {
      const assetPath = publicRoot + card.portrait.replace("/assets/", "assets/");
      expect(existsSync(assetPath), card.name + " portrait should exist").toBe(true);
      const svg = readFileSync(assetPath, "utf8");
      expect(svg).toContain("<svg");
      expect(svg).toContain('href="season7-lineup.png"');
    }
    expect(existsSync(publicRoot + "assets/cards/season7-lineup.png")).toBe(true);
  });
});
