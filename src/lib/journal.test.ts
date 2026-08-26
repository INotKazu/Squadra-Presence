import { describe, expect, it } from "vitest";
import { DEMO_TRACKER_RESPONSE } from "./fixture";
import { EMPTY_PLAYER_JOURNAL, mergePlayerJournal, roleRankObservations, sanitizePlayerJournal } from "./journal";
import { normalizeTrackerResponse } from "./tracker";

describe("player journal", () => {
  it("deduplicates matches and rank observations", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    const first = mergePlayerJournal(EMPTY_PLAYER_JOURNAL, profile, 100);
    const second = mergePlayerJournal(first, profile, 200);
    expect(first.matches).toHaveLength(1);
    expect(second.matches).toHaveLength(1);
    expect(second.ranks).toHaveLength(1);
    expect(second.matches[0]?.role).toBe("damage");
  });

  it("records a new rank snapshot when a role score changes", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    const first = mergePlayerJournal(EMPTY_PLAYER_JOURNAL, profile, 100);
    const updated = {
      ...profile,
      roleRanks: { ...profile.roleRanks, tank: { ...profile.roleRanks.tank, score: 1005, code: "C2" } },
    };
    expect(mergePlayerJournal(first, updated, 200).ranks).toHaveLength(2);
  });

  it("builds each role trend from only that role's RP movements", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    const first = mergePlayerJournal(EMPTY_PLAYER_JOURNAL, profile, 100);
    const tankUpdate = {
      ...profile,
      latestMatch: { ...profile.latestMatch!, playedAt: "2026-08-24T01:20:00Z" },
      roleRanks: { ...profile.roleRanks, tank: { ...profile.roleRanks.tank, score: 1005, code: "C2" } },
    };
    const second = mergePlayerJournal(first, tankUpdate, 200);
    expect(roleRankObservations(second.ranks, "damage")).toHaveLength(1);
    expect(roleRankObservations(second.ranks, "tank")).toHaveLength(2);
    expect(roleRankObservations(second.ranks, "technical")).toHaveLength(1);
  });

  it("repairs previously cached unknown fighters after an ID mapping update", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    const match = profile.latestMatch!;
    const repaired = sanitizePlayerJournal({
      matches: [{
        ...match,
        id: "old-unknown-row",
        characterRankingId: "2497566854",
        characterName: "Unknown Fighter",
        role: "damage",
        observedAt: 100,
      }],
      ranks: [],
    });
    expect(repaired.matches[0]?.characterName).toBe("Frieza (Fourth Form)");
    expect(repaired.matches[0]?.role).toBe("technical");
  });

  it("enriches an existing saved match when the tracker later reports its MVP trophy", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    const first = mergePlayerJournal(EMPTY_PLAYER_JOURNAL, profile, 100);
    const stale = { ...first, matches: first.matches.map((match) => ({ ...match, isMvp: null })) };
    const repaired = mergePlayerJournal(stale, profile, 200);
    expect(repaired.matches).toHaveLength(1);
    expect(repaired.matches[0]?.isMvp).toBe(true);
    expect(repaired.matches[0]?.observedAt).toBe(100);
  });
});
