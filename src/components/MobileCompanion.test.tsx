import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../lib/storage";
import { MobileNav, MobileProfileCard } from "./MobileCompanion";
import { SettingsPanel } from "./SettingsPanel";

describe("mobile companion surfaces", () => {
  it("renders touch navigation and the complete player snapshot", () => {
    const markup = renderToStaticMarkup(
      <>
        <MobileProfileCard
          profile={null}
          settings={DEFAULT_SETTINGS}
          journal={{ matches: [], ranks: [] }}
          onOpenHistory={() => undefined}
          onOpenStars={() => undefined}
        />
        <MobileNav active="dashboard" onNavigate={() => undefined} />
      </>,
    );

    expect(markup).toContain("Player snapshot");
    expect(markup).toContain("Star level");
    expect(markup).toContain("Saved matches");
    expect(markup).toContain("Total votes");
    expect(markup).toContain("Zeni");
    expect(markup).toContain("Journal");
    expect(markup).toContain("Builds");
    expect(markup).toContain("Settings");
  });

  it("keeps desktop-only controls out of mobile settings", () => {
    const markup = renderToStaticMarkup(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        mobileRuntime
        onChange={() => undefined}
        onSelectCharacter={() => undefined}
        onCheckUpdates={async () => undefined}
        updateChecking={false}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("Squadra Companion");
    expect(markup).toContain("Encrypted cloud link");
    expect(markup).toContain("Share backup");
    expect(markup).toContain("while the companion is open");
    expect(markup).not.toContain("Game process hints");
    expect(markup).not.toContain("Start and stop with the game");
    expect(markup).not.toContain("Launch hidden with Windows");
    expect(markup).not.toContain("Application updates");
  });
});
