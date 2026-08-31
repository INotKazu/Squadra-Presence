import type {
  Smite2BuildRecommendation,
  Smite2GameMode,
  Smite2MatchSnapshot,
  Smite2Platform,
  Smite2Role,
} from "./domain";
import { SMITE2_GAME_MODES, SMITE2_PLATFORMS, SMITE2_ROLES } from "./domain";
import { isApprovedSmite2SourceUrl, toSmite2Slug } from "./sources";

export const SMITE2_STORAGE_KEYS = {
  settings: "kazucorp-smite2.settings.v1",
  builds: "kazucorp-smite2.builds.v1",
  journal: "kazucorp-smite2.journal.v1",
  sourceCache: "kazucorp-smite2.source-cache.v1",
  cloudLink: "kazucorp-smite2.cloud-link.v1",
} as const;

export interface Smite2Settings {
  playerName: string;
  platform: Smite2Platform;
  selectedGodSlug: string;
  defaultRole: Smite2Role;
  defaultMode: Smite2GameMode;
  autoSync: boolean;
  presenceEnabled: boolean;
  overlayEnabled: boolean;
  launchAtLogin: boolean;
  startupAnimation: boolean;
}

export interface Smite2SavedBuild extends Smite2BuildRecommendation {
  savedAt: string;
  notes: string;
}

export interface Smite2Journal {
  matches: Smite2MatchSnapshot[];
}

export const DEFAULT_SMITE2_SETTINGS: Smite2Settings = {
  playerName: "",
  platform: "steam",
  selectedGodSlug: "",
  defaultRole: "solo",
  defaultMode: "conquest",
  autoSync: true,
  presenceEnabled: false,
  overlayEnabled: true,
  launchAtLogin: false,
  startupAnimation: true,
};

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

function safeGodSlug(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return toSmite2Slug(value);
  } catch {
    return "";
  }
}

export function sanitizeSmite2Settings(value: unknown): Smite2Settings {
  const candidate = value && typeof value === "object" ? value as Partial<Smite2Settings> : {};
  return {
    playerName: typeof candidate.playerName === "string" ? candidate.playerName.trim().slice(0, 64) : "",
    platform: isOneOf(candidate.platform, SMITE2_PLATFORMS) ? candidate.platform : DEFAULT_SMITE2_SETTINGS.platform,
    selectedGodSlug: safeGodSlug(candidate.selectedGodSlug),
    defaultRole: isOneOf(candidate.defaultRole, SMITE2_ROLES) ? candidate.defaultRole : DEFAULT_SMITE2_SETTINGS.defaultRole,
    defaultMode: isOneOf(candidate.defaultMode, SMITE2_GAME_MODES) ? candidate.defaultMode : DEFAULT_SMITE2_SETTINGS.defaultMode,
    autoSync: typeof candidate.autoSync === "boolean" ? candidate.autoSync : DEFAULT_SMITE2_SETTINGS.autoSync,
    presenceEnabled: typeof candidate.presenceEnabled === "boolean" ? candidate.presenceEnabled : DEFAULT_SMITE2_SETTINGS.presenceEnabled,
    overlayEnabled: typeof candidate.overlayEnabled === "boolean" ? candidate.overlayEnabled : DEFAULT_SMITE2_SETTINGS.overlayEnabled,
    launchAtLogin: typeof candidate.launchAtLogin === "boolean" ? candidate.launchAtLogin : DEFAULT_SMITE2_SETTINGS.launchAtLogin,
    startupAnimation: typeof candidate.startupAnimation === "boolean" ? candidate.startupAnimation : DEFAULT_SMITE2_SETTINGS.startupAnimation,
  };
}

export function isSmite2SavedBuild(value: unknown): value is Smite2SavedBuild {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Smite2SavedBuild>;
  return typeof candidate.id === "string"
    && (candidate.source === "smitebrain" || candidate.source === "smitesource")
    && typeof candidate.sourceUrl === "string"
    && isApprovedSmite2SourceUrl(candidate.sourceUrl)
    && Boolean(safeGodSlug(candidate.godSlug))
    && typeof candidate.title === "string"
    && typeof candidate.savedAt === "string"
    && typeof candidate.notes === "string"
    && Array.isArray(candidate.startingItems)
    && Array.isArray(candidate.finalItems)
    && Array.isArray(candidate.relics);
}

export function sanitizeSmite2SavedBuilds(value: unknown): Smite2SavedBuild[] {
  return Array.isArray(value) ? value.filter(isSmite2SavedBuild).slice(0, 250) : [];
}

export function sanitizeSmite2Journal(value: unknown): Smite2Journal {
  const candidate = value && typeof value === "object" ? value as Partial<Smite2Journal> : {};
  const matches = Array.isArray(candidate.matches)
    ? candidate.matches.filter((match): match is Smite2MatchSnapshot => (
      Boolean(match)
      && typeof match === "object"
      && typeof match.matchId === "string"
      && typeof match.playedAt === "string"
      && Boolean(safeGodSlug(match.godSlug))
      && isOneOf(match.mode, SMITE2_GAME_MODES)
      && ["win", "loss", "unknown"].includes(match.outcome)
      && Array.isArray(match.items)
    )).slice(0, 1_000)
    : [];
  return { matches };
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadSmite2Settings(): Smite2Settings {
  return sanitizeSmite2Settings(readJson(SMITE2_STORAGE_KEYS.settings));
}

export function saveSmite2Settings(value: Smite2Settings): Smite2Settings {
  const sanitized = sanitizeSmite2Settings(value);
  writeJson(SMITE2_STORAGE_KEYS.settings, sanitized);
  return sanitized;
}

export function loadSmite2SavedBuilds(): Smite2SavedBuild[] {
  return sanitizeSmite2SavedBuilds(readJson(SMITE2_STORAGE_KEYS.builds));
}

export function saveSmite2SavedBuilds(value: Smite2SavedBuild[]): Smite2SavedBuild[] {
  const sanitized = sanitizeSmite2SavedBuilds(value);
  writeJson(SMITE2_STORAGE_KEYS.builds, sanitized);
  return sanitized;
}

export function loadSmite2Journal(): Smite2Journal {
  return sanitizeSmite2Journal(readJson(SMITE2_STORAGE_KEYS.journal));
}

export function saveSmite2Journal(value: Smite2Journal): Smite2Journal {
  const sanitized = sanitizeSmite2Journal(value);
  writeJson(SMITE2_STORAGE_KEYS.journal, sanitized);
  return sanitized;
}
