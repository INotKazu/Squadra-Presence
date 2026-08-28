import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StarCollectionWorkspace } from "./StarCollectionWorkspace";

describe("Star Collection workspace", () => {
  it("provides clean mobile sections without removing the complete roadmap", () => {
    const markup = renderToStaticMarkup(
      <StarCollectionWorkspace
        level={134}
        trackerLevel={134}
        votes={259}
        zeni={6415}
        playerRank={{ code: "C", score: 3176, floor: 0, ceiling: 1, progress: 0 }}
        onLevelChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("Star Collection sections");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Roadmap");
    expect(markup).toContain("Heroes");
    expect(markup).toContain("Browse every level from 1–255");
    expect(markup).toContain("36 heroes");
    expect(markup).toContain('aria-label="Show Tier IV fighters"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Level</span><strong>255</strong>");
    expect(markup).toContain("All levels");
  });
});
