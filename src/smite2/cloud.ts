import type { Smite2Settings, Smite2Journal, Smite2SavedBuild } from "./storage";
import {
  sanitizeSmite2Journal,
  sanitizeSmite2SavedBuilds,
  sanitizeSmite2Settings,
} from "./storage";

const SMITE2_CLOUD_NAMESPACE = "smite2-cloud-v1";
const LINK_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LINK_CODE_LENGTH = 24;
const AES_GCM_IV_BYTES = 12;

export interface Smite2CloudEnvelope {
  version: 1;
  algorithm: "AES-GCM";
  iv: string;
  ciphertext: string;
}

export interface Smite2CloudSecrets {
  vaultId: string;
  authToken: string;
  encryptionKey: Uint8Array<ArrayBuffer>;
}

export interface Smite2CloudPayload {
  format: "kazucorp-smite2-cloud-vault";
  version: 1;
  exportedAt: string;
  settings: Smite2Settings;
  savedBuilds: Smite2SavedBuild[];
  journal: Smite2Journal;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("The SMITE 2 cloud copy is damaged or incomplete.");
  }
}

async function sha256(value: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export function normalizeSmite2LinkCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/gu, "");
}

export function isValidSmite2LinkCode(value: string): boolean {
  const normalized = normalizeSmite2LinkCode(value);
  return normalized.length === LINK_CODE_LENGTH
    && Array.from(normalized).every((character) => LINK_CODE_ALPHABET.includes(character));
}

export async function deriveSmite2CloudSecrets(linkCode: string): Promise<Smite2CloudSecrets> {
  const normalized = normalizeSmite2LinkCode(linkCode);
  if (!isValidSmite2LinkCode(normalized)) throw new Error("Enter the complete 24-character private link code.");
  const [vaultDigest, authDigest, keyDigest] = await Promise.all([
    sha256(`${SMITE2_CLOUD_NAMESPACE}:vault:${normalized}`),
    sha256(`${SMITE2_CLOUD_NAMESPACE}:auth:${normalized}`),
    sha256(`${SMITE2_CLOUD_NAMESPACE}:key:${normalized}`),
  ]);
  return {
    vaultId: bytesToHex(vaultDigest),
    authToken: bytesToHex(authDigest),
    encryptionKey: keyDigest,
  };
}

async function importSmite2Key(linkCode: string): Promise<CryptoKey> {
  const { encryptionKey } = await deriveSmite2CloudSecrets(linkCode);
  return crypto.subtle.importKey("raw", encryptionKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSmite2CloudText(plaintext: string, linkCode: string): Promise<Smite2CloudEnvelope> {
  const key = await importSmite2Key(linkCode);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return {
    version: 1,
    algorithm: "AES-GCM",
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

export async function decryptSmite2CloudText(envelope: Smite2CloudEnvelope, linkCode: string): Promise<string> {
  if (envelope.version !== 1 || envelope.algorithm !== "AES-GCM") {
    throw new Error("This SMITE 2 cloud copy uses an unsupported encryption format.");
  }
  try {
    const key = await importSmite2Key(linkCode);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) },
      key,
      base64UrlToBytes(envelope.ciphertext),
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    if (error instanceof Error && /link code|damaged|unsupported/iu.test(error.message)) throw error;
    throw new Error("SMITE 2 cloud copy decryption failed. Check the private link code.");
  }
}

export function createSmite2CloudPayload(
  settings: Smite2Settings,
  savedBuilds: Smite2SavedBuild[],
  journal: Smite2Journal,
): Smite2CloudPayload {
  return {
    format: "kazucorp-smite2-cloud-vault",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: sanitizeSmite2Settings(settings),
    savedBuilds: sanitizeSmite2SavedBuilds(savedBuilds),
    journal: sanitizeSmite2Journal(journal),
  };
}

export function parseSmite2CloudPayload(text: string): Smite2CloudPayload {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The decrypted SMITE 2 cloud copy is not valid JSON.");
  }
  if (!value || typeof value !== "object") throw new Error("That is not a SMITE 2 cloud copy.");
  const candidate = value as Partial<Smite2CloudPayload>;
  if (candidate.format !== "kazucorp-smite2-cloud-vault" || candidate.version !== 1) {
    throw new Error("This is not a supported KazuCorp SMITE 2 cloud copy.");
  }
  return {
    format: "kazucorp-smite2-cloud-vault",
    version: 1,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    settings: sanitizeSmite2Settings(candidate.settings),
    savedBuilds: sanitizeSmite2SavedBuilds(candidate.savedBuilds),
    journal: sanitizeSmite2Journal(candidate.journal),
  };
}
