import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeasonSevenHub } from "./SeasonSevenHub";

describe("Season 7 hub", () => {
  it("renders the published hero dates, card rotation, and anniversary campaigns", () => {
    const markup = renderToStaticMarkup(<SeasonSevenHub />);
    expect(markup).toContain("Season 7 operations board");
    expect(markup).toContain("Super Gogeta");
    expect(markup).toContain("SEP 29");
    expect(markup).toContain("OCT 13");
    expect(markup).toContain("12</strong> new cards");
    expect(markup).toContain("6</strong> returning");
    expect(markup).toContain("12</strong> rotated out");
    expect(markup).toContain("5 free Capsules a day");
  });
});
