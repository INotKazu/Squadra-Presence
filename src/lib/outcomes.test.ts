import { describe, expect, it } from "vitest";
import type { MatchJournalEntry } from "../types";
import { matchOutcomeKind, matchWinRate, performanceMatches } from "./outcomes";

function match(outcome: string): MatchJournalEntry {
  return {
    id: outcome,
    seasonId: "6",
    characterRankingId: "hero-0001",
    characterName: "Test Fighter",
    outcome,
    gameType: "Ranked",
    teamFormat: "4v4",
    playedAt: "2026-08-26T00:00:00Z",
    level: 1,
    knockouts: 0,
    assists: 0,
    damage: 0,
    durationSeconds: 0,
    isMvp: false,
    rpChange: null,
    loadoutIds: [],
    role: "damage",
    observedAt: 1,
  };
}

describe("match outcomes", () => {
  it("treats tracker voids and cancellations as neutral", () => {
    expect(matchOutcomeKind("VOID")).toBe("void");
    expect(matchOutcomeKind("Cancelled")).toBe("void");
    expect(matchOutcomeKind("Win")).toBe("win");
    expect(matchOutcomeKind("Loss")).toBe("loss");
  });

  it("excludes voids from win rate and performance samples", () => {
    const matches = [match("Win"), match("Loss"), match("VOID")];
    expect(matchWinRate(matches)).toBe(50);
    expect(performanceMatches(matches).map((entry) => entry.outcome)).toEqual(["Win", "Loss"]);
  });
});

