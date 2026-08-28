import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const activityName = "MainActivity.kt";

export function patchMainActivity(source) {
  if (source.includes("View.OVER_SCROLL_NEVER")) return source;

  const activityWithBody = /class MainActivity\s*:\s*TauriActivity\(\)\s*\{/;
  const activityWithoutBody = /class MainActivity\s*:\s*TauriActivity\(\)\s*$/m;
  const webViewHook = `
  override fun onWebViewCreate(webView: android.webkit.WebView) {
    webView.overScrollMode = android.view.View.OVER_SCROLL_NEVER
    webView.isVerticalScrollBarEnabled = false
    webView.isHorizontalScrollBarEnabled = false
    super.onWebViewCreate(webView)
  }
`;

  if (activityWithBody.test(source)) {
    return source.replace(activityWithBody, (declaration) => `${declaration}${webViewHook}`);
  }

  if (!activityWithoutBody.test(source)) {
    throw new Error("MainActivity does not use the expected TauriActivity template");
  }

  return source.replace(
    activityWithoutBody,
    (declaration) => `${declaration.trimEnd()} {${webViewHook}}`,
  );
}

async function findActivity(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findActivity(path);
      if (nested) return nested;
    } else if (entry.name === activityName) {
      return path;
    }
  }
  return null;
}

async function main() {
  const androidSource = join(process.cwd(), "src-tauri", "gen", "android", "app", "src", "main", "java");
  const activityPath = await findActivity(androidSource);
  if (!activityPath) throw new Error(`Could not find ${activityName} below ${androidSource}`);

  const source = await readFile(activityPath, "utf8");
  const patched = patchMainActivity(source);
  await writeFile(activityPath, patched, "utf8");
  process.stdout.write(`Disabled Android WebView overscroll in ${activityPath}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
