import { describe, expect, it } from "vitest";
import { patchMainActivity } from "../../scripts/patch-android-webview.mjs";

describe("Android WebView host patch", () => {
  it("disables the system edge stretch and native scrollbars", () => {
    const source = `package com.kazucorp.squadracompanion

class MainActivity : TauriActivity()
`;

    const patched = patchMainActivity(source);

    expect(patched).toContain("webView.overScrollMode = android.view.View.OVER_SCROLL_NEVER");
    expect(patched).toContain("webView.isVerticalScrollBarEnabled = false");
    expect(patched).toContain("webView.isHorizontalScrollBarEnabled = false");
    expect(patched).toContain("super.onWebViewCreate(webView)");
  });

  it("is safe to run more than once", () => {
    const source = "class MainActivity : TauriActivity()";
    const once = patchMainActivity(source);

    expect(patchMainActivity(once)).toBe(once);
  });

  it("preserves the current Tauri activity body", () => {
    const source = `package com.kazucorp.squadracompanion

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
`;

    const patched = patchMainActivity(source);

    expect(patched.match(/class MainActivity/g)).toHaveLength(1);
    expect(patched).toContain("override fun onWebViewCreate");
    expect(patched).toContain("override fun onCreate");
    expect(patched).toContain("enableEdgeToEdge()");
  });
});
