import { describe, expect, it } from "vitest";
import {
  SMITE2_SOURCE_IDS,
  SMITE2_SOURCES,
  assertApprovedSmite2SourceUrl,
  isApprovedSmite2SourceUrl,
  smiteBrainBuildsUrl,
  smiteBrainGodBuildsUrl,
  smiteSourceBuildsUrl,
  smiteSourceGodsUrl,
  smiteSourceItemsUrl,
  smiteSourceTrackerUrl,
  sourceForUrl,
  toSmite2Slug,
} from "./sources";

describe("SMITE 2 source policy", () => {
  it("contains only the two approved providers", () => {
    expect(SMITE2_SOURCE_IDS).toEqual(["smitebrain", "smitesource"]);
    expect(Object.keys(SMITE2_SOURCES)).toEqual(SMITE2_SOURCE_IDS);
  });

  it("accepts HTTPS pages and owned asset subdomains", () => {
    expect(isApprovedSmite2SourceUrl("https://smitebrain.com/builds")).toBe(true);
    expect(isApprovedSmite2SourceUrl("https://www.smitebrain.com/gods/ra/builds")).toBe(true);
    expect(isApprovedSmite2SourceUrl("https://smitesource.com/tracker")).toBe(true);
    expect(isApprovedSmite2SourceUrl("https://cdn.smitesource.com/gods/ra.png")).toBe(true);
    expect(sourceForUrl("https://cdn.smitesource.com/gods/ra.png")?.id).toBe("smitesource");
  });

  it("rejects every unapproved or ambiguous URL form", () => {
    expect(isApprovedSmite2SourceUrl("https://www.smitefire.com/smite2/guide/example")).toBe(false);
    expect(isApprovedSmite2SourceUrl("http://smitesource.com/builds")).toBe(false);
    expect(isApprovedSmite2SourceUrl("https://smitesource.com.evil.example/builds")).toBe(false);
    expect(isApprovedSmite2SourceUrl("https://smitebrain.com:8443/builds")).toBe(false);
    expect(isApprovedSmite2SourceUrl("https://user:pass@smitebrain.com/builds")).toBe(false);
    expect(isApprovedSmite2SourceUrl("not a URL")).toBe(false);
    expect(() => assertApprovedSmite2SourceUrl("https://example.com/builds")).toThrow(/only HTTPS SmiteBrain and SmiteSource/i);
  });
});

describe("SMITE 2 source entry points", () => {
  it("builds stable URLs without allowing path injection", () => {
    expect(smiteBrainBuildsUrl()).toBe("https://smitebrain.com/builds");
    expect(smiteBrainGodBuildsUrl("Nu Wa")).toBe("https://smitebrain.com/gods/nu-wa/builds");
    expect(smiteSourceBuildsUrl("The Morrigan")).toBe("https://smitesource.com/builds?god=the-morrigan");
    expect(smiteSourceBuildsUrl()).toBe("https://smitesource.com/builds");
    expect(smiteSourceTrackerUrl()).toBe("https://smitesource.com/tracker");
    expect(smiteSourceGodsUrl()).toBe("https://smitesource.com/gods");
    expect(smiteSourceItemsUrl()).toBe("https://smitesource.com/items");
    expect(toSmite2Slug("Cu Chulainn")).toBe("cu-chulainn");
    expect(toSmite2Slug("../../tracker?god=Ra")).toBe("tracker-god-ra");
    expect(() => toSmite2Slug("---")).toThrow(/valid SMITE 2 god/i);
  });
});
