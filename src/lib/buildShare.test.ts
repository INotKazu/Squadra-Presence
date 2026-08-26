import { describe, expect, it } from "vitest";
import { decodeBuildShare, encodeBuildShare } from "./buildShare";
import type { SavedBuild } from "../types";

const build: SavedBuild = {
  id: "local-only",
  characterRankingId: "3875954222",
  name: "Bardock • defense",
  cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"],
  helperId: "dende",
  notes: "Hold the line—then counter.",
  createdAt: 1,
  updatedAt: 2,
};

describe("build share codes", () => {
  it("round-trips a Unicode build without local IDs", () => {
    const code = encodeBuildShare(build);
    expect(code.startsWith("SPB1.")).toBe(true);
    expect(decodeBuildShare(code)).toEqual({
      characterRankingId: build.characterRankingId,
      name: build.name,
      cardIds: build.cardIds,
      helperId: build.helperId,
      notes: build.notes,
    });
  });

  it("rejects damaged or incompatible builds", () => {
    expect(() => decodeBuildShare("not-a-build")).toThrow(/SPB1/);
    expect(() => decodeBuildShare("SPB1.invalid")).toThrow(/damaged|invalid/i);
  });
});
