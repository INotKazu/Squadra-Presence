import type {
  AppSettings,
  CuratedBuild,
  JournalStore,
  RoleGainHistory,
  SavedBuild,
  StarRewardOverrides,
} from "../types";
import { isSavedBuild, loadSavedBuilds, saveSavedBuilds } from "./buildLibrary";
import { loadJournalStore, sanitizeJournalStore, saveJournalStore } from "./journal";
import { loadKazumaPickOverrides, sanitizeKazumaPickOverrides, saveKazumaPickOverrides } from "./kazumaPicks";
import { loadRankGainHistory, sanitizeRoleGainHistory, saveRankGainHistory } from "./progress";
import { loadStarRewardOverrides, sanitizeStarRewardOverrides, saveStarRewardOverrides } from "./starCollection";
import { DEFAULT_SETTINGS, sanitizeSettings, saveSettings } from "./storage";

export type PortableSettings = Pick<AppSettings,
  | "publicId"
  | "source"
  | "autoSync"
  | "characterRankingId"
  | "role"
  | "manualRank"
  | "helperAssignments"
  | "starCollectionLevel"
  | "startupAnimation"
  | "startupSound"
>;

export interface CloudBackupPayload {
  format: "squadra-cloud-vault";
  version: 1;
  exportedAt: string;
  settings: PortableSettings;
  savedBuilds: SavedBuild[];
  rankGainHistory: RoleGainHistory;
  journals: JournalStore;
  kazumaPickOverrides: Record<string, CuratedBuild>;
  starRewardOverrides: StarRewardOverrides;
}

const PORTABLE_SETTING_KEYS = [
  "publicId",
  "source",
  "autoSync",
  "characterRankingId",
  "role",
  "manualRank",
  "helperAssignments",
  "starCollectionLevel",
  "startupAnimation",
  "startupSound",
] as const satisfies readonly (keyof PortableSettings)[];

export function portableSettingsFrom(settings: AppSettings): PortableSettings {
  const sanitized = sanitizeSettings(settings);
  return Object.fromEntries(PORTABLE_SETTING_KEYS.map((key) => [key, sanitized[key]])) as unknown as PortableSettings;
}

function sanitizePortableSettings(value: unknown): PortableSettings {
  const candidate = value && typeof value === "object" ? value as Partial<PortableSettings> : {};
  return portableSettingsFrom(sanitizeSettings({ ...DEFAULT_SETTINGS, ...candidate }));
}

export function mergePortableSettings(current: AppSettings, portable: PortableSettings): AppSettings {
  return sanitizeSettings({ ...current, ...sanitizePortableSettings(portable) });
}

export function createCloudBackup(settings: AppSettings): CloudBackupPayload {
  return {
    format: "squadra-cloud-vault",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: portableSettingsFrom(settings),
    savedBuilds: loadSavedBuilds(),
    rankGainHistory: loadRankGainHistory(),
    journals: loadJournalStore(),
    kazumaPickOverrides: loadKazumaPickOverrides(),
    starRewardOverrides: loadStarRewardOverrides(),
  };
}

export function serializeCloudBackup(settings: AppSettings): string {
  return JSON.stringify(createCloudBackup(settings));
}

export function parseCloudBackup(text: string): CloudBackupPayload {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The decrypted cloud copy is not valid JSON.");
  }
  if (!value || typeof value !== "object") throw new Error("That is not a Squadra cloud copy.");
  const candidate = value as Partial<CloudBackupPayload>;
  if (candidate.format !== "squadra-cloud-vault" || candidate.version !== 1) {
    throw new Error("This cloud copy is not supported by this version of Squadra Presence.");
  }
  const savedBuilds = Array.isArray(candidate.savedBuilds) ? candidate.savedBuilds.filter(isSavedBuild) : [];
  if (Array.isArray(candidate.savedBuilds) && savedBuilds.length !== candidate.savedBuilds.length) {
    throw new Error("The cloud copy contains an invalid saved build.");
  }
  return {
    format: "squadra-cloud-vault",
    version: 1,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    settings: sanitizePortableSettings(candidate.settings),
    savedBuilds,
    rankGainHistory: sanitizeRoleGainHistory(candidate.rankGainHistory),
    journals: sanitizeJournalStore(candidate.journals),
    kazumaPickOverrides: sanitizeKazumaPickOverrides(candidate.kazumaPickOverrides),
    starRewardOverrides: sanitizeStarRewardOverrides(candidate.starRewardOverrides),
  };
}

export function comparableCloudBackupText(text: string): string {
  const cloud = parseCloudBackup(text);
  const { exportedAt: _exportedAt, ...portableData } = cloud;
  return JSON.stringify(portableData);
}

export function restoreCloudBackup(text: string, currentSettings: AppSettings): AppSettings {
  const cloud = parseCloudBackup(text);
  const settings = mergePortableSettings(currentSettings, cloud.settings);
  saveSettings(settings);
  saveSavedBuilds(cloud.savedBuilds);
  saveRankGainHistory(cloud.rankGainHistory);
  saveJournalStore(cloud.journals);
  saveKazumaPickOverrides(cloud.kazumaPickOverrides);
  saveStarRewardOverrides(cloud.starRewardOverrides);
  return settings;
}
