import type { PlayerJournal } from "../types";

export interface SeasonDefinition {
  id: string;
  label: string;
  startedAt: number;
}

// Add the next official season and its UTC start timestamp here. Journal rows
// are reassigned from their saved timestamps during sanitization, so an updater
// release can establish a clean boundary even if a player updates a little late.
export const SEASON_DEFINITIONS: SeasonDefinition[] = [
  { id: "6", label: "Season 6", startedAt: 0 },
  // Bandai Namco announced that Season 7 begins on September 9, 2026.
  // Use the published calendar date as the journal boundary until the
  // maintenance notice provides a more precise global server timestamp.
  { id: "7", label: "Season 7", startedAt: Date.parse("2026-09-09T00:00:00Z") },
];

export function activeSeasonAt(timestamp = Date.now()): SeasonDefinition {
  return [...SEASON_DEFINITIONS].reverse().find((season) => timestamp >= season.startedAt) ?? SEASON_DEFINITIONS[0]!;
}

export const CURRENT_SEASON = activeSeasonAt();
export const CURRENT_SEASON_ID = CURRENT_SEASON.id;

export function seasonLabel(seasonId: string): string {
  return SEASON_DEFINITIONS.find((season) => season.id === seasonId)?.label ?? `Season ${seasonId}`;
}

export function seasonIdForTimestamp(value: string | number | null | undefined): string {
  const timestamp = typeof value === "number" ? value : value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp)) return activeSeasonAt().id;
  return [...SEASON_DEFINITIONS].reverse().find((season) => timestamp >= season.startedAt)?.id ?? SEASON_DEFINITIONS[0]!.id;
}

export function journalSeasonIds(journal: PlayerJournal): string[] {
  const observed = new Set([
    activeSeasonAt().id,
    ...journal.matches.map((match) => match.seasonId),
    ...journal.ranks.map((rank) => rank.seasonId),
  ]);
  const knownOrder = new Map(SEASON_DEFINITIONS.map((season, index) => [season.id, index]));
  return [...observed].sort((left, right) => (knownOrder.get(right) ?? -1) - (knownOrder.get(left) ?? -1) || right.localeCompare(left));
}

export function journalForSeason(journal: PlayerJournal, seasonId: string): PlayerJournal {
  return {
    matches: journal.matches.filter((match) => match.seasonId === seasonId),
    ranks: journal.ranks.filter((rank) => rank.seasonId === seasonId),
  };
}
