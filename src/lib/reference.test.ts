import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { CHARACTERS } from "./characters";
import { getHelper } from "./helpers";
import { getHeroReferenceId, getRecommendedBuild } from "./reference";

describe("fighter reference mapping", () => {
  it("covers every current fighter with a recommendation", () => {
    expect(CHARACTERS).toHaveLength(40);
    for (const character of CHARACTERS) {
      expect(getHeroReferenceId(character), character.name).toMatch(/^\d{4}$/);
      expect(getRecommendedBuild(character), character.name).not.toBeNull();
    }
  });

  it("uses valid cards and role-compatible helpers", () => {
    const cardIds = new Set(CARDS.map((card) => card.id));
    for (const character of CHARACTERS) {
      const build = getRecommendedBuild(character)!;
      expect(build.cardIds).toHaveLength(3);
      expect(build.cardIds.every((cardId) => cardIds.has(cardId))).toBe(true);
      const helper = getHelper(build.helperId);
      expect(helper?.role).toBe(character.defaultRole);
    }
  });
});
