import { getCard } from "./cards";
import { CHARACTERS } from "./characters";
import { getHelper } from "./helpers";
import type { SavedBuild } from "../types";

const SHARE_PREFIX = "SPB1.";

interface SharedBuildPayload {
  version: 1;
  characterRankingId: string;
  name: string;
  cardIds: string[];
  helperId: string | null;
  notes: string;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function validateSharedBuild(value: unknown): SharedBuildPayload {
  if (!value || typeof value !== "object") throw new Error("That build code does not contain a valid build.");
  const candidate = value as Partial<SharedBuildPayload>;
  if (candidate.version !== 1) throw new Error("That build code uses an unsupported version.");
  const character = CHARACTERS.find((entry) => entry.rankingId === candidate.characterRankingId);
  if (!character) throw new Error("That build references an unknown fighter.");
  if (typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 48) {
    throw new Error("That build has an invalid name.");
  }
  if (!Array.isArray(candidate.cardIds) || candidate.cardIds.length !== 3) {
    throw new Error("A shared build must contain exactly three cards.");
  }
  const cards = candidate.cardIds.map((cardId) => typeof cardId === "string" ? getCard(cardId) : null);
  if (cards.some((card) => !card) || new Set(cards.map((card) => card!.slot)).size !== 3) {
    throw new Error("A shared build must contain one valid card from each slot.");
  }
  if (candidate.helperId !== null && typeof candidate.helperId !== "string") {
    throw new Error("That build has an invalid Helper.");
  }
  const helper = getHelper(candidate.helperId ?? null);
  if (candidate.helperId && (!helper || helper.role !== character.defaultRole)) {
    throw new Error("That Helper is not compatible with the fighter's role.");
  }
  if (typeof candidate.notes !== "string" || candidate.notes.length > 140) {
    throw new Error("That build's notes are invalid.");
  }
  return {
    version: 1,
    characterRankingId: character.rankingId,
    name: candidate.name.trim(),
    cardIds: cards.map((card) => card!.id),
    helperId: helper?.id ?? null,
    notes: candidate.notes,
  };
}

export function encodeBuildShare(build: SavedBuild): string {
  const payload: SharedBuildPayload = {
    version: 1,
    characterRankingId: build.characterRankingId,
    name: build.name,
    cardIds: [...build.cardIds],
    helperId: build.helperId,
    notes: build.notes,
  };
  return `${SHARE_PREFIX}${encodeBase64Url(JSON.stringify(validateSharedBuild(payload)))}`;
}

export function decodeBuildShare(code: string): Omit<SavedBuild, "id" | "createdAt" | "updatedAt"> {
  const normalized = code.trim();
  if (!normalized.startsWith(SHARE_PREFIX)) throw new Error("Build codes must begin with SPB1.");
  try {
    const payload = validateSharedBuild(JSON.parse(decodeBase64Url(normalized.slice(SHARE_PREFIX.length))));
    return {
      characterRankingId: payload.characterRankingId,
      name: payload.name,
      cardIds: payload.cardIds,
      helperId: payload.helperId,
      notes: payload.notes,
    };
  } catch (error) {
    if (error instanceof Error && !/JSON|base64|character/i.test(error.message)) throw error;
    throw new Error("That build code is damaged or incomplete.");
  }
}
