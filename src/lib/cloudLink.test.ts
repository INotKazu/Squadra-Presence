import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CloudSyncConflictError,
  createCloudLinkState,
  downloadCloudCopy,
  normalizeCloudEndpoint,
  syncCloudCopy,
  uploadThisDevice,
  verifyCloudEndpoint,
} from "./cloudLink";
import { DEFAULT_SETTINGS } from "./storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

interface RemoteCopy {
  authorization: string;
  revision: number;
  updatedAt: string;
  envelope: unknown;
}

function installCloudTestRuntime(): void {
  const localStorage = new MemoryStorage();
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", {
    localStorage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    location: { reload: () => undefined },
  });
  let remote: RemoteCopy | null = null;
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const authorization = new Headers(init?.headers).get("Authorization") ?? "";
    if (init?.method === "GET") {
      if (!remote) return Response.json({ error: "Cloud copy not found." }, { status: 404 });
      if (authorization !== remote.authorization) return Response.json({ error: "Authorization failed." }, { status: 403 });
      return Response.json(remote);
    }
    const body = JSON.parse(String(init?.body)) as { expectedRevision: number; envelope: unknown };
    if (remote && authorization !== remote.authorization) return Response.json({ error: "Authorization failed." }, { status: 403 });
    if (body.expectedRevision !== (remote?.revision ?? 0)) return Response.json({ error: "Cloud revision changed." }, { status: 409 });
    remote = {
      authorization,
      revision: (remote?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      envelope: body.envelope,
    };
    return Response.json({ revision: remote.revision, updatedAt: remote.updatedAt });
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("cloud link configuration", () => {
  it("accepts Cloudflare Workers HTTPS endpoints", () => {
    expect(normalizeCloudEndpoint("https://squadra-vault.kazucorp.workers.dev/"))
      .toBe("https://squadra-vault.kazucorp.workers.dev");
    expect(createCloudLinkState(
      "https://squadra-vault.kazucorp.workers.dev",
      "2345-6789-ABCD-EFGH-JKLM-NPQR",
    ).revision).toBe(0);
  });

  it("rejects insecure or unrelated cloud endpoints", () => {
    expect(() => normalizeCloudEndpoint("http://example.com")).toThrow(/HTTPS/i);
    expect(() => normalizeCloudEndpoint("https://example.com")).toThrow(/workers.dev/i);
  });

  it("verifies the deployed Squadra vault before linking a device", async () => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: true,
      service: "squadra-cloud-vault",
      encryption: "client-side",
    })));
    await expect(verifyCloudEndpoint("https://squadra-vault.kazucorp.workers.dev/"))
      .resolves.toBe("https://squadra-vault.kazucorp.workers.dev");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
    await expect(verifyCloudEndpoint("https://squadra-vault.kazucorp.workers.dev"))
      .rejects.toThrow(/not a compatible Squadra cloud vault/i);
  });

  it("uploads, pairs a second device, and stops divergent copies", async () => {
    installCloudTestRuntime();
    const endpoint = "https://squadra-vault.kazucorp.workers.dev";
    const code = "2345-6789-ABCD-EFGH-JKLM-NPQR";
    const firstSettings = {
      ...DEFAULT_SETTINGS,
      publicId: "12345678-1234-1234-1234-123456789abc",
      starCollectionLevel: 10,
    };

    const firstUpload = await uploadThisDevice(firstSettings, createCloudLinkState(endpoint, code));
    expect(firstUpload.state.revision).toBe(1);

    const secondDownload = await downloadCloudCopy(
      { ...DEFAULT_SETTINGS, starCollectionLevel: 1 },
      createCloudLinkState(endpoint, code),
    );
    expect(secondDownload.settings.starCollectionLevel).toBe(10);
    expect(secondDownload.state.revision).toBe(1);

    const secondUpload = await syncCloudCopy(
      { ...secondDownload.settings, starCollectionLevel: 22 },
      secondDownload.state,
    );
    expect(secondUpload.action).toBe("uploaded");
    expect(secondUpload.state.revision).toBe(2);

    await expect(syncCloudCopy(
      { ...firstSettings, manualRank: "A4" },
      firstUpload.state,
    )).rejects.toBeInstanceOf(CloudSyncConflictError);
  });
});
