import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StartupSplash } from "./StartupSplash";

describe("startup splash", () => {
  it("uses the KazuCorp wolf mark for the gold charge sequence", () => {
    const markup = renderToStaticMarkup(
      <StartupSplash soundEnabled={false} onComplete={() => undefined} />,
    );

    expect(markup).toContain('/assets/kazucorp-logo.png');
    expect(markup).toContain('alt="KazuCorp wolf emblem"');
    expect(markup).toContain("Link charged");
  });
});
