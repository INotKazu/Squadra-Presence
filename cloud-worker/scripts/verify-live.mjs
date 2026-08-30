import { randomBytes } from "node:crypto";

const rawEndpoint = process.env.CLOUD_SYNC_URL?.trim() ?? "";

if (!rawEndpoint) {
  throw new Error("CLOUD_SYNC_URL is not configured for this repository.");
}

const endpoint = new URL(rawEndpoint);
if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".workers.dev")) {
  throw new Error("CLOUD_SYNC_URL must be an HTTPS workers.dev URL.");
}
if (endpoint.username || endpoint.password) {
  throw new Error("CLOUD_SYNC_URL cannot contain a username or password.");
}
endpoint.search = "";
endpoint.hash = "";
endpoint.pathname = endpoint.pathname.replace(/\/+$/u, "");
const rootEndpoint = endpoint.toString().replace(/\/$/u, "");

async function requestJson(path, init = {}) {
  const response = await fetch(`${rootEndpoint}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

const health = await requestJson("/health");

if (!health.response.ok) {
  throw new Error(`Cloud vault health check failed with HTTP ${health.response.status}.`);
}
if (!health.body || health.body.ok !== true || health.body.service !== "squadra-cloud-vault" || health.body.encryption !== "client-side") {
  throw new Error("CLOUD_SYNC_URL does not point to a compatible Squadra cloud vault.");
}

const vaultId = randomBytes(32).toString("hex");
const authToken = randomBytes(32).toString("hex");
const vaultPath = `/v1/vaults/${vaultId}`;
const authorization = { Authorization: `Bearer ${authToken}` };
const firstEnvelope = {
  version: 1,
  algorithm: "AES-GCM",
  iv: randomBytes(12).toString("base64url"),
  ciphertext: randomBytes(32).toString("base64url"),
};

const created = await requestJson(vaultPath, {
  method: "PUT",
  headers: { ...authorization, "Content-Type": "application/json" },
  body: JSON.stringify({ expectedRevision: 0, envelope: firstEnvelope }),
});
if (!created.response.ok || created.body?.revision !== 1) {
  throw new Error(`Live vault create failed with HTTP ${created.response.status}.`);
}

const read = await requestJson(vaultPath, { headers: authorization });
if (!read.response.ok || read.body?.revision !== 1 || read.body?.envelope?.ciphertext !== firstEnvelope.ciphertext) {
  throw new Error(`Live vault read failed with HTTP ${read.response.status}.`);
}

const unauthorized = await requestJson(vaultPath, {
  headers: { Authorization: `Bearer ${randomBytes(32).toString("hex")}` },
});
if (unauthorized.response.status !== 403) {
  throw new Error(`Live vault authentication returned HTTP ${unauthorized.response.status} instead of 403.`);
}

const staleWrite = await requestJson(vaultPath, {
  method: "PUT",
  headers: { ...authorization, "Content-Type": "application/json" },
  body: JSON.stringify({ expectedRevision: 0, envelope: firstEnvelope }),
});
if (staleWrite.response.status !== 409) {
  throw new Error(`Live vault revision protection returned HTTP ${staleWrite.response.status} instead of 409.`);
}

const secondEnvelope = { ...firstEnvelope, ciphertext: randomBytes(32).toString("base64url") };
const updated = await requestJson(vaultPath, {
  method: "PUT",
  headers: { ...authorization, "Content-Type": "application/json" },
  body: JSON.stringify({ expectedRevision: 1, envelope: secondEnvelope }),
});
if (!updated.response.ok || updated.body?.revision !== 2) {
  throw new Error(`Live vault update failed with HTTP ${updated.response.status}.`);
}

console.log(`Verified live Squadra cloud vault health, D1 storage, authentication, and revision safety: ${endpoint.origin}`);
