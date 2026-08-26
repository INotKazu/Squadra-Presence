import type { CuratedBuild } from "../types";
import { getCard } from "./cards";
import { getCharacter } from "./characters";
import { getHelper } from "./helpers";

const KAZUMA_PICK_OVERRIDES_KEY = "squadra-presence.kazuma-pick-overrides.v1";

// Creator-curated builds bundled with every install. Keep this collection
// separate from DBGS recommendations so its authorship is always unambiguous.
export const KAZUMA_PICKS: CuratedBuild[] = [
  {
    id: "kazuma-bardock-survival",
    characterRankingId: "3875954222",
    name: "Kazuma's Bardock build",
    cardIds: ["1-2-verde", "2-1-verde", "3-1-verde"],
    helperId: "dende",
    notes: "Kazuma's high-survival Bardock setup: extra emergency health, steady damage reduction, and a safer Vanishing Step.",
    why: "Build Up can make me focus too hard on stacks and fall behind. I prefer immediate durability so I can keep pressure on towers and objectives.",
  },
  {
    id: "kazuma-broly-solo-carry",
    characterRankingId: "2735236247",
    name: "Kazuma's solo-queue Broly",
    cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"],
    helperId: null,
    notes: "Stack that power, pressure high-health tanks, and stay alive while contesting towers and bosses. Pick the Damage Helper that best fits the match.",
    why: "I already farm Build Up naturally on Broly. Giant Slayer helps into high-HP tanks, while Defense Step keeps the solo-queue frontline carry alive.",
  },
  {
    id: "kazuma-goku-black-pressure",
    characterRankingId: "661292423",
    name: "Kazuma's Goku Black pressure build",
    cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"],
    helperId: null,
    notes: "Build Up scaling with Giant Slayer pressure and Defense Step safety. Pick the Technical Helper that best fits the match.",
    why: "I use Build Up on Goku Black and wanted a way to pressure high-HP or over-health targets. Giant Slayer adds that pressure and Defense Step is the safety net.",
  },
];

function sanitizePick(candidate: unknown, base: CuratedBuild): CuratedBuild | null {
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as Partial<CuratedBuild>;
  if (value.id !== base.id || value.characterRankingId !== base.characterRankingId) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  if (!Array.isArray(value.cardIds) || value.cardIds.length !== 3 || !value.cardIds.every((entry) => typeof entry === "string")) return null;
  const cards = value.cardIds.map(getCard);
  if (cards.some((card) => !card) || new Set(cards.map((card) => card?.slot)).size !== 3) return null;
  const fighter = getCharacter(base.characterRankingId);
  const helperId = typeof value.helperId === "string" ? value.helperId : null;
  if (helperId && getHelper(helperId)?.role !== fighter.defaultRole) return null;
  return {
    id: base.id,
    characterRankingId: base.characterRankingId,
    name: value.name.trim().slice(0, 56),
    cardIds: [...value.cardIds],
    helperId,
    notes: typeof value.notes === "string" ? value.notes.trim().slice(0, 280) : "",
    why: typeof value.why === "string" ? value.why.trim().slice(0, 420) : "",
  };
}

export function sanitizeKazumaPickOverrides(value: unknown): Record<string, CuratedBuild> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, CuratedBuild> = {};
  for (const base of KAZUMA_PICKS) {
    const candidate = sanitizePick((value as Record<string, unknown>)[base.id], base);
    if (candidate) result[base.id] = candidate;
  }
  return result;
}

export function loadKazumaPickOverrides(): Record<string, CuratedBuild> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(KAZUMA_PICK_OVERRIDES_KEY);
    return value ? sanitizeKazumaPickOverrides(JSON.parse(value)) : {};
  } catch {
    return {};
  }
}

export function saveKazumaPickOverrides(overrides: Record<string, CuratedBuild>): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KAZUMA_PICK_OVERRIDES_KEY, JSON.stringify(sanitizeKazumaPickOverrides(overrides)));
  }
}

export function getKazumaPicks(characterRankingId: string, overrides: Record<string, CuratedBuild> = {}): CuratedBuild[] {
  return KAZUMA_PICKS
    .filter((build) => build.characterRankingId === characterRankingId)
    .map((build) => overrides[build.id] ?? build);
}
