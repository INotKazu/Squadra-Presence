import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("desktop content security policy", () => {
  it("allows same-origin fetches used to prepare OBS overlay artwork", () => {
    const config = JSON.parse(readFileSync(resolve("src-tauri/tauri.conf.json"), "utf8"));
    const csp = String(config.app?.security?.csp ?? "");

    expect(csp).toMatch(/connect-src[^;]*'self'/);
    expect(csp).toContain("frame-src http://127.0.0.1:47612");
  });
});
