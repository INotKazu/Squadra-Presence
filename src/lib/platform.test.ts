import { describe, expect, it } from "vitest";
import { detectRuntimePlatform, isMobilePlatform, supportsObsOverlay } from "./platform";

describe("runtime platform detection", () => {
  it("recognizes Android inside a Tauri webview", () => {
    const platform = detectRuntimePlatform(
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36",
      true,
    );

    expect(platform).toBe("android");
    expect(isMobilePlatform(platform)).toBe(true);
  });

  it("recognizes iPhone and iPad user agents", () => {
    expect(detectRuntimePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", true)).toBe("ios");
    expect(detectRuntimePlatform("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", true)).toBe("ios");
    expect(detectRuntimePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", true, 5)).toBe("ios");
  });

  it("keeps desktop Tauri and browser previews distinct", () => {
    expect(detectRuntimePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", true)).toBe("desktop");
    expect(detectRuntimePlatform("Mozilla/5.0 (X11; Linux x86_64)", false)).toBe("browser");
    expect(isMobilePlatform("desktop")).toBe(false);
    expect(supportsObsOverlay("desktop")).toBe(true);
    expect(supportsObsOverlay("browser")).toBe(false);
    expect(supportsObsOverlay("android")).toBe(false);
    expect(supportsObsOverlay("ios")).toBe(false);
  });
});
