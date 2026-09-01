import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SMITE 2 desktop identity", () => {
  it("uses a separate bundle and OBS boundary", () => {
    const config = JSON.parse(readFileSync(resolve("src-tauri/tauri.conf.json"), "utf8"));
    const csp = String(config.app?.security?.csp ?? "");

    expect(csp).toMatch(/connect-src[^;]*'self'/);
    expect(csp).toContain("https://*.workers.dev");
    expect(config.identifier).toBe("com.kazucorp.smite2companion");
    expect(config.productName).toBe("KazuCorp SMITE 2 Companion");
    expect(csp).toContain("frame-src http://127.0.0.1:47622");
    expect(csp).not.toContain("47612");
  });
});
