import type { AbilityReference, SavedBuild } from "../types";
import { getCard } from "./cards";
import { CHARACTERS } from "./characters";
import { getHelper } from "./helpers";

const BUILDS_KEY = "squadra-presence.saved-builds.v1";
const ABILITY_CACHE_PREFIX = "squadra-presence.ability-cache.v1.";
const ABILITY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function isSavedBuild(value: unknown): value is SavedBuild {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedBuild>;
  const character = CHARACTERS.find((entry) => entry.rankingId === candidate.characterRankingId);
  const cards = Array.isArray(candidate.cardIds)
    ? candidate.cardIds.map((entry) => typeof entry === "string" ? getCard(entry) : null)
    : [];
  const helper = typeof candidate.helperId === "string" ? getHelper(candidate.helperId) : null;
  return Boolean(character)
    && typeof candidate.id === "string"
    && typeof candidate.characterRankingId === "string"
    && typeof candidate.name === "string" && candidate.name.length > 0 && candidate.name.length <= 48
    && cards.length === 3
    && cards.every(Boolean)
    && new Set(cards.map((card) => card!.slot)).size === 3
    && (candidate.helperId === null || typeof candidate.helperId === "string")
    && (!helper || helper.role === character!.defaultRole)
    && (!candidate.helperId || Boolean(helper))
    && typeof candidate.notes === "string" && candidate.notes.length <= 140
    && typeof candidate.createdAt === "number"
    && typeof candidate.updatedAt === "number";
}

export function loadSavedBuilds(): SavedBuild[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(BUILDS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isSavedBuild) : [];
  } catch {
    return [];
  }
}

export function saveSavedBuilds(builds: SavedBuild[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUILDS_KEY, JSON.stringify(builds));
}

export function createBuildId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AbilityCacheRecord {
  fetchedAt: number;
  abilities: AbilityReference[];
}

function isAbilityReference(value: unknown): value is AbilityReference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AbilityReference>;
  return typeof candidate.slot === "string"
    && typeof candidate.key === "string"
    && typeof candidate.name === "string"
    && typeof candidate.description === "string";
}

export function loadCachedAbilities(heroId: string): AbilityReference[] | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(`${ABILITY_CACHE_PREFIX}${heroId}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<AbilityCacheRecord>;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > ABILITY_CACHE_MAX_AGE) return null;
    return Array.isArray(parsed.abilities) ? parsed.abilities.filter(isAbilityReference) : null;
  } catch {
    return null;
  }
}

export function cacheAbilities(heroId: string, abilities: AbilityReference[]): void {
  if (typeof window === "undefined") return;
  const record: AbilityCacheRecord = { fetchedAt: Date.now(), abilities };
  window.localStorage.setItem(`${ABILITY_CACHE_PREFIX}${heroId}`, JSON.stringify(record));
}
