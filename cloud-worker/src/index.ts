interface Env {
  DB: D1Database;
}

interface VaultRow {
  verifier_hash: string;
  ciphertext: string;
  iv: string;
  revision: number;
  updated_at: string;
}

interface VaultWriteBody {
  expectedRevision: number;
  envelope: {
    version: 1;
    algorithm: "AES-GCM";
    iv: string;
    ciphertext: string;
  };
}

const VAULT_ID_PATTERN = /^[a-f0-9]{64}$/u;
const AUTH_TOKEN_PATTERN = /^[a-f0-9]{64}$/u;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const MAX_REQUEST_BYTES = 1_800_000;
const MAX_CIPHERTEXT_CHARACTERS = 1_700_000;

const SECURITY_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([a-f0-9]{64})$/u.exec(authorization);
  return match?.[1] ?? null;
}

function isVaultWriteBody(value: unknown): value is VaultWriteBody {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VaultWriteBody>;
  const envelope = candidate.envelope;
  return typeof candidate.expectedRevision === "number"
    && Number.isInteger(candidate.expectedRevision)
    && candidate.expectedRevision >= 0
    && Boolean(envelope)
    && envelope?.version === 1
    && envelope.algorithm === "AES-GCM"
    && typeof envelope.iv === "string"
    && envelope.iv.length === 16
    && BASE64_URL_PATTERN.test(envelope.iv)
    && typeof envelope.ciphertext === "string"
    && envelope.ciphertext.length > 0
    && envelope.ciphertext.length <= MAX_CIPHERTEXT_CHARACTERS
    && BASE64_URL_PATTERN.test(envelope.ciphertext);
}

async function readWriteBody(request: Request): Promise<VaultWriteBody | Response> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) return json({ error: "Encrypted cloud copy is too large." }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return json({ error: "Encrypted cloud copy is too large." }, 413);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }
  return isVaultWriteBody(value) ? value : json({ error: "Encrypted cloud copy is invalid." }, 400);
}

async function authorize(request: Request): Promise<{ token: string; verifierHash: string } | Response> {
  const token = bearerToken(request);
  if (!token || !AUTH_TOKEN_PATTERN.test(token)) return json({ error: "Authorization required." }, 401);
  return { token, verifierHash: await sha256Hex(`squadra-cloud-v1:verifier:${token}`) };
}

async function getVault(request: Request, env: Env, vaultId: string): Promise<Response> {
  const authorization = await authorize(request);
  if (authorization instanceof Response) return authorization;
  const row = await env.DB.prepare(
    "SELECT verifier_hash, ciphertext, iv, revision, updated_at FROM vaults WHERE id = ?1",
  ).bind(vaultId).first<VaultRow>();
  if (!row) return json({ error: "Cloud copy not found." }, 404);
  if (!constantTimeEqual(row.verifier_hash, authorization.verifierHash)) {
    return json({ error: "Authorization failed." }, 403);
  }
  return json({
    revision: row.revision,
    updatedAt: row.updated_at,
    envelope: {
      version: 1,
      algorithm: "AES-GCM",
      iv: row.iv,
      ciphertext: row.ciphertext,
    },
  });
}

async function putVault(request: Request, env: Env, vaultId: string): Promise<Response> {
  const authorization = await authorize(request);
  if (authorization instanceof Response) return authorization;
  const body = await readWriteBody(request);
  if (body instanceof Response) return body;
  const existing = await env.DB.prepare(
    "SELECT verifier_hash, revision, updated_at FROM vaults WHERE id = ?1",
  ).bind(vaultId).first<Pick<VaultRow, "verifier_hash" | "revision" | "updated_at">>();
  const updatedAt = new Date().toISOString();

  if (!existing) {
    if (body.expectedRevision !== 0) return json({ error: "Cloud revision changed. Sync again before uploading." }, 409);
    const inserted = await env.DB.prepare(
      "INSERT OR IGNORE INTO vaults (id, verifier_hash, ciphertext, iv, revision, updated_at) VALUES (?1, ?2, ?3, ?4, 1, ?5)",
    ).bind(vaultId, authorization.verifierHash, body.envelope.ciphertext, body.envelope.iv, updatedAt).run();
    if (inserted.meta.changes !== 1) return json({ error: "Cloud revision changed. Sync again before uploading." }, 409);
    return json({ revision: 1, updatedAt });
  }

  if (!constantTimeEqual(existing.verifier_hash, authorization.verifierHash)) {
    return json({ error: "Authorization failed." }, 403);
  }
  if (existing.revision !== body.expectedRevision) {
    return json({
      error: "Cloud revision changed. Choose which copy to keep.",
      revision: existing.revision,
      updatedAt: existing.updated_at,
    }, 409);
  }
  const nextRevision = existing.revision + 1;
  const updated = await env.DB.prepare(
    "UPDATE vaults SET ciphertext = ?1, iv = ?2, revision = ?3, updated_at = ?4 WHERE id = ?5 AND verifier_hash = ?6 AND revision = ?7",
  ).bind(
    body.envelope.ciphertext,
    body.envelope.iv,
    nextRevision,
    updatedAt,
    vaultId,
    authorization.verifierHash,
    existing.revision,
  ).run();
  if (updated.meta.changes !== 1) return json({ error: "Cloud revision changed. Sync again before uploading." }, 409);
  return json({ revision: nextRevision, updatedAt });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: SECURITY_HEADERS });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "squadra-cloud-vault", encryption: "client-side" });
    }
    const match = /^\/v1\/vaults\/([a-f0-9]{64})$/u.exec(url.pathname);
    if (!match || !VAULT_ID_PATTERN.test(match[1] ?? "")) return json({ error: "Not found." }, 404);
    const vaultId = match[1] as string;
    if (request.method === "GET") return getVault(request, env, vaultId);
    if (request.method === "PUT") return putVault(request, env, vaultId);
    return json({ error: "Method not allowed." }, 405);
  },
} satisfies ExportedHandler<Env>;
