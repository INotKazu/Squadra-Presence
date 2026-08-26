import { describe, expect, it } from "vitest";
import { buildPresence, deriveSelection } from "./presence";
import { DEFAULT_SETTINGS } from "./storage";
import type { PlayerProfile } from "../types";

describe("buildPresence", () => {
  it("uses uploaded Discord asset keys", () => {
    const presence = buildPresence(
      {
        characterId: "3875954222",
        characterName: "Ultra Instinct (Sign) Bardock",
        role: "tank",
        rank: "C3",
        largeImageKey: "character_bardock",
      },
      123,
    );
    expect(presence.largeImageKey).toBe("character_bardock");
    expect(presence.smallImageKey).toBe("rank_c3");
    expect(presence.state).toBe("ROLE TANK │ RANK C3");
  });

  it("uses the Youth Goku asset from the complete roster", () => {
    const presence = buildPresence(
      {
        characterId: "1232069625",
        characterName: "Son Goku (Youth)",
        role: "damage",
        rank: "A4",
        largeImageKey: "character_goku_youth",
      },
      123,
    );
    expect(presence.largeImageKey).toBe("character_goku_youth");
    expect(presence.smallImageKey).toBe("rank_a4");
    expect(presence.state).toBe("ROLE DAMAGE │ RANK A4");
  });

  it("shows an assigned helper without replacing the rank badge", () => {
    const presence = buildPresence(
      {
        characterId: "3875954222",
        characterName: "Ultra Instinct (Sign) Bardock",
        role: "tank",
        rank: "C3",
        largeImageKey: "character_bardock",
        helperId: "dende",
        helperName: "Dende",
      },
      123,
    );
    expect(presence.smallImageKey).toBe("rank_c3");
    expect(presence.state).toBe("ROLE TANK │ RANK C3 │ HELPER DENDE");
    expect(presence.smallImageText).toContain("Helper • Dende");
  });

  it("ties the latest fighter to its official role rank", () => {
    const rank = (code: string) => ({ code, score: 0, floor: 0, ceiling: 0, progress: 0 });
    const profile: PlayerProfile = {
      nickname: "Kazuma",
      playerRank: rank("A4"),
      votes: null,
      zeni: null,
      roleRanks: {
        damage: rank("A4"),
        tank: rank("C3"),
        technical: rank("C4"),
      },
      matches: [],
      latestMatch: {
        characterRankingId: "1232069625",
        characterName: "Son Goku (Youth)",
        outcome: "win",
        gameType: "Ranked",
        teamFormat: "4v4",
        playedAt: "2026-08-24T00:00:00Z",
        level: null,
        knockouts: null,
        assists: null,
        damage: null,
        durationSeconds: null,
        isMvp: null,
        rpChange: null,
        loadoutIds: [],
      },
      lastSeenAt: null,
      starCollectionLevel: null,
    };
    const selection = deriveSelection(
      { ...DEFAULT_SETTINGS, source: "tracker", role: "tank" },
      profile,
    );
    expect(selection.characterName).toBe("Son Goku (Youth)");
    expect(selection.role).toBe("damage");
    expect(selection.rank).toBe("A4");
  });

  it("repairs a stale manual role and ignores an incompatible helper", () => {
    const selection = deriveSelection(
      {
        ...DEFAULT_SETTINGS,
        source: "manual",
        characterRankingId: "1232069625",
        role: "tank",
        manualRank: "A4",
        helperAssignments: { "1232069625": "dende" },
      },
      null,
    );
    expect(selection.role).toBe("damage");
    expect(selection.helperId).toBeUndefined();
  });
});
