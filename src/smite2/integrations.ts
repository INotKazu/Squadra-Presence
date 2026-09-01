import { invoke } from "@tauri-apps/api/core";
import type { Smite2Settings } from "./storage";

export const SMITE2_OBS_PORT = 47_622;
export const SMITE2_OBS_URL = `http://127.0.0.1:${SMITE2_OBS_PORT}/overlay`;

export interface Smite2PresencePayload {
  details: string;
  state: string;
  largeImageKey: string;
  largeImageText: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp: number;
}

export interface Smite2OverlaySnapshot {
  enabled: boolean;
  playerName: string;
  godName: string;
  role: string;
  mode: string;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  sessionStartedAt: number;
  updatedAt: number;
}

export interface Smite2IntegrationStatus {
  running: boolean;
  url: string;
  error: string | null;
}

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const titleCase = (value: string) => value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());

export function buildSmite2Presence(settings: Smite2Settings, startedAt: number): Smite2PresencePayload {
  const godName = settings.selectedGodSlug ? titleCase(settings.selectedGodSlug) : "Choosing a god";
  return {
    details: godName,
    state: `${titleCase(settings.defaultRole)} • ${titleCase(settings.defaultMode)}`,
    largeImageKey: "smite2_companion",
    largeImageText: "KazuCorp SMITE 2 Companion",
    smallImageKey: `role_${settings.defaultRole}`,
    smallImageText: `${titleCase(settings.defaultRole)} role`,
    startTimestamp: startedAt,
  };
}

export function buildSmite2Overlay(
  settings: Smite2Settings,
  startedAt: number,
  record = { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0 },
): Smite2OverlaySnapshot {
  return {
    enabled: settings.overlayEnabled,
    playerName: settings.playerName || "Player",
    godName: settings.selectedGodSlug ? titleCase(settings.selectedGodSlug) : "Select a god",
    role: settings.defaultRole,
    mode: settings.defaultMode,
    ...record,
    sessionStartedAt: startedAt,
    updatedAt: Math.floor(Date.now() / 1_000),
  };
}

export async function setSmite2Presence(payload: Smite2PresencePayload): Promise<void> {
  if (isTauri()) await invoke("set_smite2_discord_presence", { payload });
}

export async function clearSmite2Presence(): Promise<void> {
  if (isTauri()) await invoke("clear_smite2_discord_presence");
}

export async function updateSmite2Overlay(snapshot: Smite2OverlaySnapshot): Promise<void> {
  if (isTauri()) await invoke("update_smite2_overlay_state", { snapshot });
}

export async function getSmite2OverlayStatus(): Promise<Smite2IntegrationStatus> {
  if (!isTauri()) return { running: true, url: SMITE2_OBS_URL, error: null };
  return invoke<Smite2IntegrationStatus>("smite2_overlay_status");
}
