import { isSavedBuild, loadSavedBuilds, saveSavedBuilds } from "./buildLibrary";
import { loadJournalStore, sanitizeJournalStore, saveJournalStore } from "./journal";
import { loadKazumaPickOverrides, sanitizeKazumaPickOverrides, saveKazumaPickOverrides } from "./kazumaPicks";
import { loadRankGainHistory, sanitizeRoleGainHistory, saveRankGainHistory } from "./progress";
import { loadStarRewardOverrides, sanitizeStarRewardOverrides, saveStarRewardOverrides } from "./starCollection";
import { sanitizeSettings, saveSettings } from "./storage";
import type { AppSettings, CuratedBuild, JournalStore, RoleGainHistory, SavedBuild, StarRewardOverrides } from "../types";

interface AppBackup {
  format: "squadra-presence-backup";
  version: 3;
  exportedAt: string;
  settings: AppSettings;
  savedBuilds: SavedBuild[];
  rankGainHistory: RoleGainHistory;
  journals: JournalStore;
  kazumaPickOverrides: Record<string, CuratedBuild>;
  starRewardOverrides: StarRewardOverrides;
}

export function createAppBackup(settings: AppSettings): AppBackup {
  return {
    format: "squadra-presence-backup",
    version: 3,
    exportedAt: new Date().toISOString(),
    settings: sanitizeSettings(settings),
    savedBuilds: loadSavedBuilds(),
    rankGainHistory: loadRankGainHistory(),
    journals: loadJournalStore(),
    kazumaPickOverrides: loadKazumaPickOverrides(),
    starRewardOverrides: loadStarRewardOverrides(),
  };
}

export function serializeAppBackup(settings: AppSettings): string {
  return JSON.stringify(createAppBackup(settings), null, 2);
}

export function parseAppBackup(text: string): AppBackup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!value || typeof value !== "object") throw new Error("That file is not a Squadra Presence backup.");
  const candidate = value as Partial<Omit<AppBackup, "version">> & { version?: number };
  if (candidate.format !== "squadra-presence-backup" || ![1, 2, 3].includes(candidate.version ?? 0)) {
    throw new Error("That backup format is not supported by this version.");
  }
  const savedBuilds = Array.isArray(candidate.savedBuilds) ? candidate.savedBuilds.filter(isSavedBuild) : [];
  if (Array.isArray(candidate.savedBuilds) && savedBuilds.length !== candidate.savedBuilds.length) {
    throw new Error("The backup contains an invalid saved build.");
  }
  return {
    format: "squadra-presence-backup",
    version: 3,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    settings: sanitizeSettings(candidate.settings),
    savedBuilds,
    rankGainHistory: sanitizeRoleGainHistory(candidate.rankGainHistory),
    journals: sanitizeJournalStore(candidate.journals),
    kazumaPickOverrides: candidate.version === 2 || candidate.version === 3 ? sanitizeKazumaPickOverrides(candidate.kazumaPickOverrides) : {},
    starRewardOverrides: candidate.version === 2 || candidate.version === 3 ? sanitizeStarRewardOverrides(candidate.starRewardOverrides) : {},
  };
}

export function restoreAppBackup(text: string): AppBackup {
  const backup = parseAppBackup(text);
  saveSettings(backup.settings);
  saveSavedBuilds(backup.savedBuilds);
  saveRankGainHistory(backup.rankGainHistory);
  saveJournalStore(backup.journals);
  saveKazumaPickOverrides(backup.kazumaPickOverrides);
  saveStarRewardOverrides(backup.starRewardOverrides);
  return backup;
}

function backupFilename(): string {
  return `Squadra-Presence-Backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function downloadBackup(settings: AppSettings): void {
  const blob = new Blob([serializeAppBackup(settings)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFilename();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function exportAppBackup(settings: AppSettings, preferShare = false): Promise<"shared" | "downloaded"> {
  const file = new File([serializeAppBackup(settings)], backupFilename(), { type: "application/json" });
  if (preferShare && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Squadra Companion backup",
      text: "Private Squadra Companion data backup. Keep this file private because it contains the public tracker ID.",
      files: [file],
    });
    return "shared";
  }
  downloadBackup(settings);
  return "downloaded";
}
