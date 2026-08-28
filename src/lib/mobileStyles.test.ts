import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile scroll containment", () => {
  it("removes Android's tappable scrollbar gutter from the mobile shell", () => {
    const styles = readFileSync(resolve("src/styles.css"), "utf8");

    expect(styles).toContain(".app-shell--mobile * { scrollbar-width: none; }");
    expect(styles).toContain(".app-shell--mobile *::-webkit-scrollbar { display: none; width: 0; height: 0; }");
  });
});
