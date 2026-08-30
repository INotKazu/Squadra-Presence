import { describe, expect, it } from "vitest";
import worker from "../src/index";

interface StoredVault {
  id: string;
  verifier_hash: string;
  ciphertext: string;
  iv: string;
  revision: number;
  updated_at: string;
}

class FakeStatement {
  private bindings: unknown[] = [];

  constructor(private readonly sql: string, private readonly rows: Map<string, StoredVault>) {}

  bind(...values: unknown[]): FakeStatement {
    this.bindings = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    return (this.rows.get(String(this.bindings[0])) ?? null) as T | null;
  }

  async run(): Promise<D1Result> {
    if (this.sql.startsWith("INSERT OR IGNORE")) {
      const [id, verifierHash, ciphertext, iv, updatedAt] = this.bindings.map(String);
      if (!id || this.rows.has(id)) return result(0);
      this.rows.set(id, {
        id,
        verifier_hash: verifierHash ?? "",
        ciphertext: ciphertext ?? "",
        iv: iv ?? "",
        revision: 1,
        updated_at: updatedAt ?? "",
      });
      return result(1);
    }
    if (this.sql.startsWith("UPDATE vaults")) {
      const [ciphertext, iv, revision, updatedAt, id, verifierHash, expectedRevision] = this.bindings;
      const existing = this.rows.get(String(id));
      if (!existing || existing.verifier_hash !== String(verifierHash) || existing.revision !== Number(expectedRevision)) return result(0);
      this.rows.set(String(id), {
        ...existing,
        ciphertext: String(ciphertext),
        iv: String(iv),
        revision: Number(revision),
        updated_at: String(updatedAt),
      });
      return result(1);
    }
    return result(0);
  }
}

class FakeDatabase {
  readonly rows = new Map<string, StoredVault>();

  prepare(sql: string): FakeStatement {
    return new FakeStatement(sql, this.rows);
  }
}

function result(changes: number): D1Result {
  return {
    success: true,
    results: [],
    meta: { changes },
  } as unknown as D1Result;
}

function writeRequest(vaultId: string, token: string, expectedRevision: number, ciphertext: string): Request {
  return new Request(`https://vault.example/v1/vaults/${vaultId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedRevision,
      envelope: { version: 1, algorithm: "AES-GCM", iv: "AAAAAAAAAAAAAAAA", ciphertext },
    }),
  });
}

describe("cloud vault Worker", () => {
  it("creates, authenticates, reads, and revision-protects an encrypted vault", async () => {
    const database = new FakeDatabase();
    const env = { DB: database as unknown as D1Database };
    const vaultId = "b".repeat(64);
    const token = "a".repeat(64);

    const created = await worker.fetch(writeRequest(vaultId, token, 0, "ciphertext-one"), env);
    expect(created.status).toBe(200);
    expect(await created.json()).toMatchObject({ revision: 1 });

    const read = await worker.fetch(new Request(`https://vault.example/v1/vaults/${vaultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }), env);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({
      revision: 1,
      envelope: { algorithm: "AES-GCM", ciphertext: "ciphertext-one" },
    });

    const unauthorized = await worker.fetch(new Request(`https://vault.example/v1/vaults/${vaultId}`, {
      headers: { Authorization: `Bearer ${"c".repeat(64)}` },
    }), env);
    expect(unauthorized.status).toBe(403);

    const stale = await worker.fetch(writeRequest(vaultId, token, 0, "stale-write"), env);
    expect(stale.status).toBe(409);

    const updated = await worker.fetch(writeRequest(vaultId, token, 1, "ciphertext-two"), env);
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ revision: 2 });
  });

  it("exposes health and rejects malformed vault paths", async () => {
    const env = { DB: new FakeDatabase() as unknown as D1Database };
    const health = await worker.fetch(new Request("https://vault.example/health"), env);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, encryption: "client-side" });
    expect((await worker.fetch(new Request("https://vault.example/v1/vaults/nope"), env)).status).toBe(404);
  });
});
