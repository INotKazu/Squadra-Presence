import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getHelper, getHelpersForRole, HELPERS } from "./helpers";

describe("helper catalog", () => {
  it("contains six helpers for every official role", () => {
    expect(HELPERS).toHaveLength(18);
    expect(getHelpersForRole("damage")).toHaveLength(6);
    expect(getHelpersForRole("tank")).toHaveLength(6);
    expect(getHelpersForRole("technical")).toHaveLength(6);
  });

  it("identifies Dende as a Tank helper and Nail as a Damage helper", () => {
    expect(getHelper("dende")?.role).toBe("tank");
    expect(getHelper("nail")?.role).toBe("damage");
  });

  it("has a bundled portrait for every helper", () => {
    for (const helper of HELPERS) {
      expect(helper.portrait, helper.label).toBeTruthy();
      expect(existsSync(resolve("public", helper.portrait!.replace(/^\//, ""))), helper.label).toBe(true);
    }
  });
});
