import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BACKGROUND_MUSIC_SOURCE, BackgroundMusic } from "./BackgroundMusic";

describe("background music", () => {
  it("bundles the original loop without exposing browser controls", () => {
    const markup = renderToStaticMarkup(
      <BackgroundMusic enabled volume={0.22} mobileRuntime />,
    );

    expect(markup).toContain(`src="${BACKGROUND_MUSIC_SOURCE}"`);
    expect(markup).toContain("loop");
    expect(markup).toContain('preload="auto"');
    expect(markup).toContain('data-background-music="evening-link"');
    expect(markup).not.toContain("controls");
  });
});
