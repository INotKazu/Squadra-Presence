import type { AppSettings } from "../types";
import { CHARACTERS } from "./characters";
import { getHelper } from "./helpers";
import { STAR_COLLECTION_MAX_LEVEL } from "./starCollection";

const SETTINGS_KEY = "squadra-presence.settings.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  publicId: "",
  source: "manual",
  autoSync: true,
  onlyWhileGameRunning: true,
  presenceEnabled: false,
  autoPresenceWithGame: true,
  launchAtLogin: false,
  characterRankingId: "3875954222",
  role: "tank",
  manualRank: "C3",
  helperAssignments: { "3875954222": "dende" },
  processHints: ["gekishin", "squadra", "dbgs", "game.exe"],
  starCollectionLevel: 1,
  starCollectionMaxLevel: STAR_COLLECTION_MAX_LEVEL,
  startupAnimation: true,
  startupSound: true,
  backgroundMusicEnabled: false,
  backgroundMusicVolume: 0.22,
  autoCheckUpdates: true,
  skippedUpdateVersion: null,
  overlayEnabled: true,
};

export function sanitizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS, helperAssignments: { ...DEFAULT_SETTINGS.helperAssignments }, processHints: [...DEFAULT_SETTINGS.processHints] };
  const parsed = value as Partial<AppSettings>;
  const source = parsed.source === "tracker" || parsed.source === "manual" ? parsed.source : DEFAULT_SETTINGS.source;
  const processHints = Array.isArray(parsed.processHints)
    ? parsed.processHints.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).map((entry) => entry.trim()).slice(0, 12)
    : DEFAULT_SETTINGS.processHints;
  const helperAssignments = parsed.helperAssignments && typeof parsed.helperAssignments === "object"
    ? Object.fromEntries(Object.entries(parsed.helperAssignments).filter(([key, helperId]) => {
      if (typeof helperId !== "string") return false;
      const character = CHARACTERS.find((entry) => entry.rankingId === key);
      const helper = getHelper(helperId);
      return Boolean(character && helper && character.defaultRole === helper.role);
    }))
    : {};
  const characterRankingId = typeof parsed.characterRankingId === "string"
    && CHARACTERS.some((character) => character.rankingId === parsed.characterRankingId)
    ? parsed.characterRankingId
    : DEFAULT_SETTINGS.characterRankingId;
  return {
    ...DEFAULT_SETTINGS,
    publicId: typeof parsed.publicId === "string" ? parsed.publicId.trim().slice(0, 64) : DEFAULT_SETTINGS.publicId,
    source,
    autoSync: typeof parsed.autoSync === "boolean" ? parsed.autoSync : DEFAULT_SETTINGS.autoSync,
    onlyWhileGameRunning: typeof parsed.onlyWhileGameRunning === "boolean" ? parsed.onlyWhileGameRunning : DEFAULT_SETTINGS.onlyWhileGameRunning,
    presenceEnabled: typeof parsed.presenceEnabled === "boolean" ? parsed.presenceEnabled : DEFAULT_SETTINGS.presenceEnabled,
    autoPresenceWithGame: typeof parsed.autoPresenceWithGame === "boolean" ? parsed.autoPresenceWithGame : DEFAULT_SETTINGS.autoPresenceWithGame,
    launchAtLogin: typeof parsed.launchAtLogin === "boolean" ? parsed.launchAtLogin : DEFAULT_SETTINGS.launchAtLogin,
    characterRankingId,
    role: parsed.role === "damage" || parsed.role === "tank" || parsed.role === "technical" ? parsed.role : DEFAULT_SETTINGS.role,
    manualRank: typeof parsed.manualRank === "string" && /^[SABC][1-4]$/.test(parsed.manualRank) ? parsed.manualRank as AppSettings["manualRank"] : DEFAULT_SETTINGS.manualRank,
    helperAssignments: { ...DEFAULT_SETTINGS.helperAssignments, ...helperAssignments },
    processHints: processHints.length ? processHints : [...DEFAULT_SETTINGS.processHints],
    starCollectionLevel: typeof parsed.starCollectionLevel === "number" && Number.isFinite(parsed.starCollectionLevel)
      ? Math.max(1, Math.min(STAR_COLLECTION_MAX_LEVEL, Math.floor(parsed.starCollectionLevel)))
      : DEFAULT_SETTINGS.starCollectionLevel,
    starCollectionMaxLevel: STAR_COLLECTION_MAX_LEVEL,
    startupAnimation: typeof parsed.startupAnimation === "boolean" ? parsed.startupAnimation : DEFAULT_SETTINGS.startupAnimation,
    startupSound: typeof parsed.startupSound === "boolean" ? parsed.startupSound : DEFAULT_SETTINGS.startupSound,
    backgroundMusicEnabled: typeof parsed.backgroundMusicEnabled === "boolean"
      ? parsed.backgroundMusicEnabled
      : DEFAULT_SETTINGS.backgroundMusicEnabled,
    backgroundMusicVolume: typeof parsed.backgroundMusicVolume === "number" && Number.isFinite(parsed.backgroundMusicVolume)
      ? Math.max(0, Math.min(1, parsed.backgroundMusicVolume))
      : DEFAULT_SETTINGS.backgroundMusicVolume,
    autoCheckUpdates: typeof parsed.autoCheckUpdates === "boolean" ? parsed.autoCheckUpdates : DEFAULT_SETTINGS.autoCheckUpdates,
    skippedUpdateVersion: typeof parsed.skippedUpdateVersion === "string" && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(parsed.skippedUpdateVersion)
      ? parsed.skippedUpdateVersion
      : null,
    overlayEnabled: typeof parsed.overlayEnabled === "boolean" ? parsed.overlayEnabled : DEFAULT_SETTINGS.overlayEnabled,
  };
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? sanitizeSettings(JSON.parse(saved)) : sanitizeSettings(DEFAULT_SETTINGS);
  } catch {
    return sanitizeSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
