import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MatchJournalEntry, RankJournalEntry } from "../types";
import { HistoryWorkspace } from "./HistoryWorkspace";

function rankObservation(observedAt: number, technicalScore: number): RankJournalEntry {
  return {
    seasonId: "6",
    observedAt,
    matchPlayedAt: null,
    scores: { damage: 904, tank: 843, technical: technicalScore },
    codes: { damage: "C3", tank: "C4", technical: "B3" },
  };
}

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
    knockouts: 1,
    assists: 1,
    damage: 1,
    durationSeconds: 60,
    isMvp: false,
    rpChange: null,
    loadoutIds: [],
    role: "damage",
    observedAt: 1,
  };
}

describe("history workspace", () => {
  it("keeps role trends unfilled and renders voids as neutral results", () => {
    const markup = renderToStaticMarkup(
      <HistoryWorkspace
        journal={{
          matches: [match("Win"), match("VOID")],
          ranks: [rankObservation(200, 1371), rankObservation(100, 1162)],
        }}
        nickname="Chy"
        onClose={() => undefined}
      />,
    );

    expect(markup.match(/<polyline[^>]*style="fill:none"[^>]*>/g)).toHaveLength(3);
    expect(markup).toContain("history-result-void");
    expect(markup).toContain("Season 6");
    expect(markup).toContain("Career");
    expect(markup).toContain("100%");
  });
});

