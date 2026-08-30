const LINK_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LINK_CODE_LENGTH = 24;
const AES_GCM_IV_BYTES = 12;

export interface CloudEncryptedEnvelope {
  version: 1;
  algorithm: "AES-GCM";
  iv: string;
  ciphertext: string;
}

export interface CloudDerivedSecrets {
  vaultId: string;
  authToken: string;
  encryptionKey: Uint8Array<ArrayBuffer>;
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
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("The encrypted cloud copy is damaged or incomplete.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

export function normalizeCloudLinkCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/gu, "");
}

export function isValidCloudLinkCode(value: string): boolean {
  const normalized = normalizeCloudLinkCode(value);
  return normalized.length === LINK_CODE_LENGTH
    && Array.from(normalized).every((character) => LINK_CODE_ALPHABET.includes(character));
}

export function formatCloudLinkCode(value: string): string {
  return normalizeCloudLinkCode(value).match(/.{1,4}/gu)?.join("-") ?? "";
}

export function generateCloudLinkCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(LINK_CODE_LENGTH));
  const code = Array.from(random, (byte) => LINK_CODE_ALPHABET[byte % LINK_CODE_ALPHABET.length]).join("");
  return formatCloudLinkCode(code);
}

export async function deriveCloudSecrets(linkCode: string): Promise<CloudDerivedSecrets> {
  const normalized = normalizeCloudLinkCode(linkCode);
  if (!isValidCloudLinkCode(normalized)) {
    throw new Error("Enter the complete 24-character private link code.");
  }
  const [vaultDigest, authDigest, keyDigest] = await Promise.all([
    sha256(`squadra-cloud-v1:vault:${normalized}`),
    sha256(`squadra-cloud-v1:auth:${normalized}`),
    sha256(`squadra-cloud-v1:key:${normalized}`),
  ]);
  return {
    vaultId: bytesToHex(vaultDigest),
    authToken: bytesToHex(authDigest),
    encryptionKey: keyDigest,
  };
}

async function importEncryptionKey(linkCode: string): Promise<CryptoKey> {
  const { encryptionKey } = await deriveCloudSecrets(linkCode);
  return crypto.subtle.importKey("raw", encryptionKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCloudText(plaintext: string, linkCode: string): Promise<CloudEncryptedEnvelope> {
  const key = await importEncryptionKey(linkCode);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    version: 1,
    algorithm: "AES-GCM",
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

export async function decryptCloudText(envelope: CloudEncryptedEnvelope, linkCode: string): Promise<string> {
  if (envelope.version !== 1 || envelope.algorithm !== "AES-GCM") {
    throw new Error("This cloud copy uses an unsupported encryption format.");
  }
  try {
    const key = await importEncryptionKey(linkCode);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) },
      key,
      base64UrlToBytes(envelope.ciphertext),
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    if (error instanceof Error && /link code|damaged|unsupported/iu.test(error.message)) throw error;
    throw new Error("Cloud copy decryption failed. Check that both devices use the exact same private link code.");
  }
}

export async function fingerprintCloudText(value: string): Promise<string> {
  return bytesToHex(await sha256(`squadra-cloud-v1:fingerprint:${value}`));
}
