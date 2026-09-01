import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SMITE 2 native isolation", () => {
  it("does not reuse the Squadra Discord application ID", () => {
    const source = readFileSync(resolve("src-tauri/src/smite2_discord.rs"), "utf8");
    expect(source).toContain('option_env!("SMITE2_DISCORD_APPLICATION_ID")');
    expect(source).not.toContain("1541227940354859099");
  });

  it("uses its own OBS service, port, and HTML", () => {
    const source = readFileSync(resolve("src-tauri/src/smite2_overlay.rs"), "utf8");
    const html = readFileSync(resolve("src-tauri/src/smite2_overlay.html"), "utf8");
    expect(source).toContain("const PORT: u16 = 47_622");
    expect(source).toContain('include_str!("smite2_overlay.html")');
    expect(html).toContain("KazuCorp divine link");
    expect(html).not.toMatch(/Bardock|Squadra ranked/iu);
  });
});
