const rawEndpoint = process.env.CLOUD_SYNC_URL?.trim() ?? "";

if (!rawEndpoint) {
  throw new Error("CLOUD_SYNC_URL is not configured for this repository.");
}

const endpoint = new URL(rawEndpoint);
if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".workers.dev")) {
  throw new Error("CLOUD_SYNC_URL must be an HTTPS workers.dev URL.");
}
endpoint.username = "";
endpoint.password = "";
endpoint.search = "";
endpoint.hash = "";
endpoint.pathname = `${endpoint.pathname.replace(/\/+$/u, "")}/health`;

const response = await fetch(endpoint, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(15_000),
});
const body = await response.json().catch(() => null);

if (!response.ok) {
  throw new Error(`Cloud vault health check failed with HTTP ${response.status}.`);
}
if (!body || body.ok !== true || body.service !== "squadra-cloud-vault" || body.encryption !== "client-side") {
  throw new Error("CLOUD_SYNC_URL does not point to a compatible Squadra cloud vault.");
}

console.log(`Verified live Squadra cloud vault: ${endpoint.origin}`);
