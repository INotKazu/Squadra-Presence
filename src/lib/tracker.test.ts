import { describe, expect, it } from "vitest";
import { DEMO_TRACKER_RESPONSE } from "./fixture";
import { normalizeTrackerResponse } from "./tracker";

describe("normalizeTrackerResponse", () => {
  it("normalizes the community tracker payload", () => {
    const profile = normalizeTrackerResponse(DEMO_TRACKER_RESPONSE);
    expect(profile.nickname).toBe("Kazuma");
    expect(profile.playerRank.code).toBe("C");
    expect(profile.playerRank.score).toBe(3393);
    expect(profile.starCollectionLevel).toBe(42);
    expect(profile.votes).toBe(317);
    expect(profile.zeni).toBe(88158);
    expect(profile.roleRanks.damage.code).toBe("A4");
    expect(profile.roleRanks.tank.code).toBe("C3");
    expect(profile.roleRanks.technical.code).toBe("C4");
    expect(profile.latestMatch?.characterRankingId).toBe("1232069625");
    expect(profile.latestMatch?.knockouts).toBe(10);
    expect(profile.latestMatch?.loadoutIds).toHaveLength(5);
    expect(profile.latestMatch?.isMvp).toBe(true);
    expect(profile.latestMatch?.rpChange).toBe(24);
    expect(profile.matches).toHaveLength(1);
  });

  it("refuses empty tracker results", () => {
    expect(() => normalizeTrackerResponse({ results: [] })).toThrow(/No player/);
  });

  it("names matches from a live ranking ID when DBGS omits character_name", () => {
    const profile = normalizeTrackerResponse({ results: [{
      nickname: "Chy",
      player_rank: 2909,
      star_collection: 17,
      votes_received: 12,
      zeni: 3456,
      rank_scores: { damage: 904, tank: 843, technical: 1162 },
      matches: [{
        character_ranking_id: 3267382816,
        outcome: "win",
        game_type: "Unknown Battle",
        team_format: "4v4",
        played_at: "2026-08-24T01:18:47+00:00",
        character_level: 11,
        knockouts: 8,
        assists: 9,
        damage: 136412,
      }],
    }] });
    expect(profile.latestMatch?.characterName).toBe("Hit");
    expect(profile.latestMatch?.characterRankingId).toBe("3267382816");
    expect(profile.playerRank.code).toBe("C");
    expect(profile.starCollectionLevel).toBe(17);
  });

  it("reads the current DBGS collection, vote, currency, and match-level MVP fields", () => {
    const profile = normalizeTrackerResponse({ results: [{
      nickname: "Kazuma",
      player_rank: 3629,
      collection: { actual: "185", total: 185 },
      field_15: "298",
      zeni: "2,019",
      rank_scores: { damage: 1600, tank: 1229, technical: 800 },
      matches: [{
        character_ranking_id: 3875954222,
        outcome: "win",
        game_type: "Ranked 4v4",
        team_format: "4v4",
        played_at: "2026-08-25T18:09:50+00:00",
        knockouts: 3,
        assists: 11,
        damage: 213690,
        mvp: true,
        data: { participants: [{ nickname: "Kazuma", is_searched_player: true, mvp: false }] },
      }],
    }] });
    expect(profile.starCollectionLevel).toBe(185);
    expect(profile.votes).toBe(298);
    expect(profile.zeni).toBe(2019);
    expect(profile.latestMatch?.isMvp).toBe(true);
  });

  it("caps a future tracker collection value at the current Level 255 roadmap", () => {
    const profile = normalizeTrackerResponse({ results: [{
      nickname: "Player",
      player_rank: 0,
      collection: { actual: 999 },
      rank_scores: {},
      matches: [],
    }] });
    expect(profile.starCollectionLevel).toBe(255);
  });
});
