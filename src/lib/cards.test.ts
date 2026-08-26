import { describe, expect, it } from "vitest";
import { CARDS, getCardsForSlot } from "./cards";

describe("card catalog", () => {
  it("contains the complete S6 set with unique IDs", () => {
    expect(CARDS).toHaveLength(18);
    expect(new Set(CARDS.map((card) => card.id)).size).toBe(18);
  });

  it("provides six choices for each build slot", () => {
    expect(getCardsForSlot(1)).toHaveLength(6);
    expect(getCardsForSlot(2)).toHaveLength(6);
    expect(getCardsForSlot(3)).toHaveLength(6);
  });
});
