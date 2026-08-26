import { describe, expect, it } from "vitest";
import { estimatedWinsRemaining, rankDivisionPoints, rankPointsRemaining } from "./progress";
import { roleRankFromScore } from "./ranks";
import type { RoleGainHistory } from "../types";

const history: RoleGainHistory = {
  damage: [],
  tank: [20, 14],
  technical: [],
  lastScores: null,
  lastMatchPlayedAt: null,
};

describe("rank progress", () => {
  it("calculates exact division progress and remaining RP", () => {
    const rank = roleRankFromScore(993);
    expect(rank.code).toBe("C3");
    expect(rankDivisionPoints(rank)).toEqual({ earned: 93, total: 100 });
    expect(rankPointsRemaining(rank)).toBe(7);
  });

  it("estimates wins from the learned positive RP pace", () => {
    expect(estimatedWinsRemaining(roleRankFromScore(993), history, "tank")).toBe(1);
    expect(estimatedWinsRemaining(roleRankFromScore(930), history, "tank")).toBe(5);
    expect(estimatedWinsRemaining(roleRankFromScore(930), history, "damage")).toBeNull();
  });
});
