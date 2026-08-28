import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile scroll containment", () => {
  it("removes Android's tappable scrollbar gutter from the mobile shell", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");

    expect(styles).toMatch(/html,\s*body,\s*#root \{[^}]*overflow: hidden;[^}]*overscroll-behavior: none;/);
    expect(styles).toContain(".app-shell--mobile * { scrollbar-width: none !important; }");
    expect(styles).toContain(".app-shell--mobile *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }");
    expect(styles).toMatch(/\.stars-workspace\.stars-view-overview \{[^}]*overflow-y: auto;[^}]*overscroll-behavior: none;/);
  });
});
