export type RuntimePlatform = "android" | "ios" | "desktop" | "browser";

const ANDROID_PATTERN = /Android/i;
const IOS_PATTERN = /iPhone|iPad|iPod/i;
const IPAD_DESKTOP_PATTERN = /Macintosh/i;

export function detectRuntimePlatform(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
  tauriRuntime = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__),
  maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
): RuntimePlatform {
  if (ANDROID_PATTERN.test(userAgent)) return "android";
  if (IOS_PATTERN.test(userAgent) || (IPAD_DESKTOP_PATTERN.test(userAgent) && maxTouchPoints > 1)) return "ios";
  return tauriRuntime ? "desktop" : "browser";
}

export function isMobilePlatform(platform = detectRuntimePlatform()): boolean {
  return platform === "android" || platform === "ios";
}
