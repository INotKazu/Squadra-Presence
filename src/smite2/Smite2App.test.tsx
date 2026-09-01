import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Smite2Dashboard } from "./Smite2App";

describe("SMITE 2 companion shell", () => {
  it("renders the isolated KazuCorp dashboard and approved sources", () => {
    const markup = renderToStaticMarkup(<Smite2Dashboard />);
    expect(markup).toContain("SMITE 2");
    expect(markup).toContain("KazuCorp");
    expect(markup).toContain("SmiteBrain");
    expect(markup).toContain("SmiteSource");
    expect(markup).toContain("https://smitebrain.com/builds");
    expect(markup).toContain("https://smitesource.com/tracker");
    expect(markup).not.toMatch(/SMITEFire/iu);
    expect(markup).not.toMatch(/Squadra profile|DBGS Builds/iu);
  });

  it("includes desktop and Android-responsive navigation", () => {
    const markup = renderToStaticMarkup(<Smite2Dashboard />);
    expect(markup).toContain('aria-label="Primary navigation"');
    expect(markup).toContain('aria-label="Mobile navigation"');
    expect(markup).toContain("Builds");
    expect(markup).toContain("Journal");
    expect(markup).toContain("Gods");
  });
});
