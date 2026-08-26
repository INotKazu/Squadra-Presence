import { describe, expect, it } from "vitest";
import { roleRankFromScore } from "./ranks";

describe("roleRankFromScore", () => {
  it.each([
    [800, "C4"],
    [899, "C4"],
    [900, "C3"],
    [993, "C3"],
    [1200, "B4"],
    [1600, "A4"],
    [1999, "A1"],
    [2000, "S4"],
    [2300, "S1"],
    [9999, "S1"],
  ])("maps %i to %s", (score, expected) => {
    expect(roleRankFromScore(score).code).toBe(expected);
  });
});
