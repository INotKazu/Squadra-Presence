import { describe, expect, it } from "vitest";
import type { MatchJournalEntry, PlayerJournal, RankJournalEntry } from "../types";
import { activeSeasonAt, journalForSeason, journalSeasonIds, seasonIdForTimestamp, seasonLabel } from "./seasons";

const match = (seasonId: string): MatchJournalEntry => ({
  id: seasonId,
  seasonId,
  characterRankingId: "hero-0001",
  characterName: "Test Fighter",
  outcome: "Win",
  gameType: "Ranked",
  teamFormat: "4v4",
  playedAt: "2026-08-26T00:00:00Z",
  level: 1,
  knockouts: 1,
  assists: 1,
  damage: 1,
  durationSeconds: 1,
  isMvp: false,
  rpChange: 10,
  loadoutIds: [],
  role: "damage",
  observedAt: 1,
});

const rank = (seasonId: string): RankJournalEntry => ({
  seasonId,
  observedAt: 1,
  matchPlayedAt: null,
  scores: { damage: 1, tank: 1, technical: 1 },
  codes: { damage: "C4", tank: "C4", technical: "C4" },
});

describe("season journal", () => {
  it("uses the official September 9 boundary for Season 7", () => {
    expect(seasonIdForTimestamp("2026-09-08T23:59:59Z")).toBe("6");
    expect(seasonIdForTimestamp("2026-09-09T00:00:00Z")).toBe("7");
    expect(activeSeasonAt(Date.parse("2026-08-30T00:00:00Z")).id).toBe("6");
    expect(activeSeasonAt(Date.parse("2026-09-09T00:00:00Z")).id).toBe("7");
    expect(seasonLabel("7")).toBe("Season 7");
  });

  it("keeps current and archived seasons independently filterable", () => {
    const journal: PlayerJournal = { matches: [match("7"), match("6"), match("5")], ranks: [rank("7"), rank("6"), rank("5")] };
    expect(journalSeasonIds(journal)).toEqual(["7", "6", "5"]);
    expect(journalForSeason(journal, "5")).toEqual({ matches: [journal.matches[2]], ranks: [journal.ranks[2]] });
  });
});
