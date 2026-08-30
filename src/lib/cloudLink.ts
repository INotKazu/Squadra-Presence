import type { AppSettings } from "../types";
import {
  decryptCloudText,
  deriveCloudSecrets,
  encryptCloudText,
  fingerprintCloudText,
  formatCloudLinkCode,
  isValidCloudLinkCode,
  type CloudEncryptedEnvelope,
} from "./cloudCrypto";
import {
  comparableCloudBackupText,
  parseCloudBackup,
  restoreCloudBackup,
  serializeCloudBackup,
} from "./cloudPayload";

const CLOUD_LINK_KEY = "squadra-presence.cloud-link.v1";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_CIPHERTEXT_CHARACTERS = 1_700_000;

export interface CloudLinkState {
  endpoint: string;
  linkCode: string;
  revision: number;
  lastSyncedFingerprint: string | null;
  lastSyncedAt: string | null;
}

export interface CloudVaultCopy {
  revision: number;
  updatedAt: string;
  envelope: CloudEncryptedEnvelope;
}

export type CloudSyncAction = "uploaded" | "downloaded" | "unchanged";

export interface CloudSyncResult {
  action: CloudSyncAction;
  state: CloudLinkState;
  settings: AppSettings;
}

interface CloudVaultResponse {
  revision?: unknown;
  updatedAt?: unknown;
  envelope?: unknown;
  error?: unknown;
}

export class CloudSyncConflictError extends Error {
  constructor(message = "Both this device and the cloud copy changed. Choose Upload this device or Download cloud copy.") {
    super(message);
    this.name = "CloudSyncConflictError";
  }
}

function emptyCloudLinkState(): CloudLinkState {
  return {
    endpoint: defaultCloudEndpoint(),
    linkCode: "",
    revision: 0,
    lastSyncedFingerprint: null,
    lastSyncedAt: null,
  };
}

export function defaultCloudEndpoint(): string {
  const configured = typeof import.meta.env.VITE_CLOUD_SYNC_URL === "string"
    ? import.meta.env.VITE_CLOUD_SYNC_URL.trim()
    : "";
  if (!configured) return "";
  try {
    return normalizeCloudEndpoint(configured);
  } catch {
    return "";
  }
}

export function normalizeCloudEndpoint(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter the Cloudflare Worker URL first.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid Cloudflare Worker URL.");
  }
  const localDevelopment = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("Cloud linking requires an HTTPS Worker URL.");
  }
  if (!localDevelopment && !url.hostname.endsWith(".workers.dev")) {
    throw new Error("Use the workers.dev URL shown after Cloudflare deploys the vault.");
  }
  if (url.username || url.password) throw new Error("The Worker URL cannot contain a username or password.");
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/u, "");
  return url.toString().replace(/\/$/u, "");
}

export function createCloudLinkState(endpoint: string, linkCode: string): CloudLinkState {
  if (!isValidCloudLinkCode(linkCode)) throw new Error("Enter the complete 24-character private link code.");
  return {
    endpoint: normalizeCloudEndpoint(endpoint),
    linkCode: formatCloudLinkCode(linkCode),
    revision: 0,
    lastSyncedFingerprint: null,
    lastSyncedAt: null,
  };
}

function sanitizeCloudLinkState(value: unknown): CloudLinkState {
  if (!value || typeof value !== "object") return emptyCloudLinkState();
  const candidate = value as Partial<CloudLinkState>;
  let endpoint = "";
  try {
    endpoint = normalizeCloudEndpoint(typeof candidate.endpoint === "string" ? candidate.endpoint : defaultCloudEndpoint());
  } catch {
    endpoint = defaultCloudEndpoint();
  }
  const linkCode = typeof candidate.linkCode === "string" && isValidCloudLinkCode(candidate.linkCode)
    ? formatCloudLinkCode(candidate.linkCode)
    : "";
  return {
    endpoint,
    linkCode,
    revision: typeof candidate.revision === "number" && Number.isInteger(candidate.revision) && candidate.revision >= 0
      ? candidate.revision
      : 0,
    lastSyncedFingerprint: typeof candidate.lastSyncedFingerprint === "string" && /^[a-f0-9]{64}$/u.test(candidate.lastSyncedFingerprint)
      ? candidate.lastSyncedFingerprint
      : null,
    lastSyncedAt: typeof candidate.lastSyncedAt === "string" ? candidate.lastSyncedAt : null,
  };
}

export function loadCloudLinkState(): CloudLinkState {
  if (typeof window === "undefined") return emptyCloudLinkState();
  try {
    const value = window.localStorage.getItem(CLOUD_LINK_KEY);
    return value ? sanitizeCloudLinkState(JSON.parse(value)) : emptyCloudLinkState();
  } catch {
    return emptyCloudLinkState();
  }
}

export function saveCloudLinkState(state: CloudLinkState): CloudLinkState {
  const sanitized = sanitizeCloudLinkState(state);
  if (typeof window !== "undefined") window.localStorage.setItem(CLOUD_LINK_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function clearCloudLinkState(): CloudLinkState {
  if (typeof window !== "undefined") window.localStorage.removeItem(CLOUD_LINK_KEY);
  return emptyCloudLinkState();
}

function assertConfigured(state: CloudLinkState): void {
  normalizeCloudEndpoint(state.endpoint);
  if (!isValidCloudLinkCode(state.linkCode)) throw new Error("Generate or enter a private link code first.");
}

async function requestWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Cloud sync timed out. Check your internet connection and Worker URL.");
    }
    throw new Error("Could not reach the cloud vault. Check your internet connection and Worker URL.");
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseResponse(response: Response): Promise<CloudVaultResponse> {
  try {
    return await response.json() as CloudVaultResponse;
  } catch {
    return {};
  }
}

function responseError(response: Response, body: CloudVaultResponse): Error {
  const serverMessage = typeof body.error === "string" ? body.error : null;
  if (response.status === 401 || response.status === 403) {
    return new Error("Cloud authorization failed. Check the private link code.");
  }
  if (response.status === 409) return new CloudSyncConflictError(serverMessage ?? undefined);
  if (response.status === 413) return new Error("This cloud copy is too large to upload.");
  if (response.status === 429) return new Error("Cloud sync is temporarily rate limited. Wait a moment and try again.");
  return new Error(serverMessage || `Cloud sync failed (${response.status}).`);
}

function parseEnvelope(value: unknown): CloudEncryptedEnvelope {
  if (!value || typeof value !== "object") throw new Error("The cloud vault returned an invalid encrypted copy.");
  const candidate = value as Partial<CloudEncryptedEnvelope>;
  if (candidate.version !== 1 || candidate.algorithm !== "AES-GCM" || typeof candidate.iv !== "string" || typeof candidate.ciphertext !== "string") {
    throw new Error("The cloud vault returned an invalid encrypted copy.");
  }
  return candidate as CloudEncryptedEnvelope;
}

async function readCloudVault(state: CloudLinkState): Promise<CloudVaultCopy | null> {
  assertConfigured(state);
  const { vaultId, authToken } = await deriveCloudSecrets(state.linkCode);
  const response = await requestWithTimeout(`${normalizeCloudEndpoint(state.endpoint)}/v1/vaults/${vaultId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" },
  });
  if (response.status === 404) return null;
  const body = await parseResponse(response);
  if (!response.ok) throw responseError(response, body);
  if (typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 1 || typeof body.updatedAt !== "string") {
    throw new Error("The cloud vault returned invalid revision information.");
  }
  return { revision: body.revision, updatedAt: body.updatedAt, envelope: parseEnvelope(body.envelope) };
}

async function writeCloudVault(state: CloudLinkState, plaintext: string, expectedRevision: number): Promise<CloudVaultCopy> {
  assertConfigured(state);
  const { vaultId, authToken } = await deriveCloudSecrets(state.linkCode);
  const envelope = await encryptCloudText(plaintext, state.linkCode);
  if (envelope.ciphertext.length > MAX_CIPHERTEXT_CHARACTERS) {
    throw new Error("This cloud copy is too large to upload. Export a local backup and remove old saved data first.");
  }
  const response = await requestWithTimeout(`${normalizeCloudEndpoint(state.endpoint)}/v1/vaults/${vaultId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ envelope, expectedRevision }),
  });
  const body = await parseResponse(response);
  if (!response.ok) throw responseError(response, body);
  if (typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 1 || typeof body.updatedAt !== "string") {
    throw new Error("The cloud vault returned invalid revision information.");
  }
  return { revision: body.revision, updatedAt: body.updatedAt, envelope };
}

async function plaintextFrom(copy: CloudVaultCopy, state: CloudLinkState): Promise<string> {
  const plaintext = await decryptCloudText(copy.envelope, state.linkCode);
  parseCloudBackup(plaintext);
  return plaintext;
}

async function contentFingerprint(plaintext: string): Promise<string> {
  return fingerprintCloudText(comparableCloudBackupText(plaintext));
}

function syncedState(state: CloudLinkState, revision: number, fingerprint: string): CloudLinkState {
  return saveCloudLinkState({
    ...state,
    revision,
    lastSyncedFingerprint: fingerprint,
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function uploadThisDevice(settings: AppSettings, state: CloudLinkState): Promise<CloudSyncResult> {
  const plaintext = serializeCloudBackup(settings);
  const remote = await readCloudVault(state);
  const written = await writeCloudVault(state, plaintext, remote?.revision ?? 0);
  const nextState = syncedState(state, written.revision, await contentFingerprint(plaintext));
  return { action: "uploaded", state: nextState, settings };
}

export async function downloadCloudCopy(settings: AppSettings, state: CloudLinkState): Promise<CloudSyncResult> {
  const remote = await readCloudVault(state);
  if (!remote) throw new Error("No cloud copy exists for this link code yet. Upload from the first device.");
  const plaintext = await plaintextFrom(remote, state);
  const restored = restoreCloudBackup(plaintext, settings);
  const nextState = syncedState(state, remote.revision, await contentFingerprint(plaintext));
  return { action: "downloaded", state: nextState, settings: restored };
}

export async function syncCloudCopy(settings: AppSettings, state: CloudLinkState): Promise<CloudSyncResult> {
  const localPlaintext = serializeCloudBackup(settings);
  const localFingerprint = await contentFingerprint(localPlaintext);
  const remote = await readCloudVault(state);
  if (!remote) {
    const written = await writeCloudVault(state, localPlaintext, 0);
    const nextState = syncedState(state, written.revision, localFingerprint);
    return { action: "uploaded", state: nextState, settings };
  }

  const remotePlaintext = await plaintextFrom(remote, state);
  const remoteFingerprint = await contentFingerprint(remotePlaintext);
  if (!state.lastSyncedFingerprint) {
    if (localFingerprint !== remoteFingerprint) throw new CloudSyncConflictError("This device has not synced before and the cloud already contains data. Choose which copy to keep.");
    const nextState = syncedState(state, remote.revision, remoteFingerprint);
    return { action: "unchanged", state: nextState, settings };
  }

  const localChanged = localFingerprint !== state.lastSyncedFingerprint;
  const cloudChanged = remote.revision !== state.revision || remoteFingerprint !== state.lastSyncedFingerprint;
  if (localChanged && cloudChanged) throw new CloudSyncConflictError();
  if (cloudChanged) {
    const restored = restoreCloudBackup(remotePlaintext, settings);
    const nextState = syncedState(state, remote.revision, remoteFingerprint);
    return { action: "downloaded", state: nextState, settings: restored };
  }
  if (localChanged) {
    const written = await writeCloudVault(state, localPlaintext, remote.revision);
    const nextState = syncedState(state, written.revision, localFingerprint);
    return { action: "uploaded", state: nextState, settings };
  }
  const nextState = syncedState(state, remote.revision, remoteFingerprint);
  return { action: "unchanged", state: nextState, settings };
}
