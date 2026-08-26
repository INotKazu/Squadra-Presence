# Squadra Presence

Squadra Presence is an unofficial, local-first Windows companion for **DRAGON BALL GEKISHIN SQUADRA**. It turns the latest public DBGS Builds tracker data—or a manual fighter/rank choice—into a polished Discord Rich Presence.

The interface is styled after the dark Squadra battle-card mockup: a fighter dashboard on the left, a live Discord preview, fighter-driven role/rank mapping, all 16 uploaded rank badges, role-filtered Helpers, recent match stats, a rank-progress display, a personal build library, and safe process-aware automation.

## What is implemented

- Tauri 2 desktop shell with a React + TypeScript interface
- Discord IPC worker that stays connected, reconnects once on failure, and clears activity on shutdown
- Discord Application ID `1541227940354859099`
- Asset-key mapping and local preview art for all 40 current playable heroes, plus `rank_c1` through `rank_s4`
- Public tracker sync through the DBGS Builds player-search endpoint
- Distribution-safe first launch: no personal tracker UUID is embedded, and Settings opens automatically on a fresh desktop installation
- Role rank calculation for Damage, Tank, and Technical divisions
- In-app RP progress bars for all three roles, with exact points to the next division
- A learned wins-to-rank estimate based on the player's own observed positive RP gains
- Latest completed-match character and stats
- Conservative two-minute polling only while the game process is detected
- Automatic 5–30 minute cooldown after HTTP 429 responses while the last successful profile stays active
- Tracker-name aliases so newly observed DBGS character IDs still map to the correct fighter art
- Complete live ranking-ID matching for all 40 fighters, including automatic repair of older Unknown Fighter history rows
- Process-name detection only—no game-memory access, injection, or anti-cheat interaction
- Manual fighter and rank fallback; the fighter always selects its official role automatically
- All 18 Helper choices from the DBGS Builds Helper list, filtered to the six compatible with the active role and remembered per fighter
- Dende preselected for Bardock, with each Helper's effect shown in the dashboard
- Corrected transparent Bardock art with a coral/teal official-style offset outline
- Automatic presence start/stop when the game process opens or closes
- Optional hidden Windows-login launch, system-tray operation, and single-instance protection
- A searchable Builds workspace for all 40 fighters, with current Season 6 recommendations and locally saved custom builds
- A bundled **Kazuma's Picks** creator collection for Bardock, Broly, and Goku Black, with short personal build notes
- All 18 Season 6 cards, split into their three valid loadout slots, with effect details on hover or keyboard focus
- Portable build codes for safely sharing one loadout without exposing the player ID or app settings
- On-demand expanded guides with situational choices, strategy, skill order, teammates, and matchup references cached for seven days
- A Skills & Passives tab that loads the selected fighter's current reference text and caches it locally for seven days
- A local 50-match battle journal with role filters, performance summaries, and RP trend charts
- Season-aware battle journals that preserve completed seasons, start each new ranked season cleanly, and provide a cross-season Career match view
- Neutral yellow Void results that do not count as losses or distort completed-match performance averages
- Tracker-linked Star Collection level, Total Votes Received, Zeni, and overall player rank with the complete current Level 1–255 reward roadmap and four Hero Unlock pools
- Explicit MVP badges and a clickable match-detail drawer; MVP is never inferred from combat stats
- Locally editable Kazuma's Picks with bundled-default reset and backup coverage
- A four-second KazuCorp Systems cold-launch sequence with an original synthesized chime, skipped during hidden startup and tray restore
- Signed one-click updates from `INotKazu/Squadra-Presence` GitHub Releases, with release notes, progress, later, and skip controls
- JSON backup and restore for settings, custom builds, Helper choices, learned rank pace, and local history
- Browser preview mode with representative fixture data
- Local settings, rank-gain history, build library, and ability-reference cache

Fresh installations leave **Launch hidden with Windows** off until the player enables it. Existing installations retain their saved tracker ID and startup preference during an upgrade.

## Important data boundary

DBGS Builds exposes completed match history, not a guaranteed active-match feed. Tracker mode therefore updates after a match appears on the community tracker. The UI deliberately calls this **Latest match**, not live in-match detection.

True mid-match character changes would need a future safe source such as an official API, a documented local log, or optional screen recognition. This project does not inspect or modify game memory.

Only the public UUID is sent to DBGS Builds for tracker sync. Opening a fighter's **Skills & Passives** tab requests that fighter's public static ability-reference text; opening **Full guide** requests the selected public build-guide page. Both references are cached locally for seven days. The separate player code is not present in this project and is never transmitted.

Build share codes contain only one build's fighter, three cards, compatible Helper, name, and notes. Full JSON backups also contain the public UUID and should therefore be treated as private; use a build code when sharing a loadout with another player.

## Rank progress and estimated wins

- The bar uses the exact role score already returned by the linked public tracker; no separate score entry is required.
- Every division from C4 through S1 uses the current score, division floor, and next threshold to show exact RP earned and remaining.
- Match rewards can vary, so the app does not claim an exact number of games. After it observes positive RP changes following new wins, it averages up to the latest eight gains and displays an approximate wins-to-rank value.
- Until it has a usable win sample for that role, the bar says **Learning your win pace**.
- Rank progress remains inside the companion and is not added to Discord Rich Presence.

## Run the desktop app on Windows 11

1. Install the current Node.js LTS release.
2. Install the Rust MSVC toolchain with `rustup`.
3. Install Microsoft C++ Build Tools if the Rust installer requests them. Windows 11 normally already includes the WebView2 runtime.
4. Open PowerShell in this folder.
5. Install dependencies:

   ```powershell
   npm install
   ```

6. Start the desktop app:

   ```powershell
   npm run tauri dev
   ```

7. Keep the Discord desktop client open. The default settings start the presence automatically when the game opens and clear it when the game closes. To test while the game is closed, turn off **Only while game is running** and click **Start presence**.

Build an installer with:

```powershell
npm run tauri build
```

Tauri writes the Windows installers under `src-tauri/target/release/bundle/`.

For the first update-enabled v0.6 build, use the signed-release workflow below instead of the plain build command.

## Signed automatic updates

The first v0.6 installation is manual. Once it is installed with the permanent updater public key embedded, future signed GitHub releases can appear as a green banner and install from inside the app.

For normal releases after the one-time setup is complete, open PowerShell in the finished source folder and run:

```powershell
.\Release-All.ps1
```

This single command installs dependencies, runs the tests, builds and signs the Windows installer, prepares `latest.json`, pushes the clean source to `main`, and creates or refreshes the matching GitHub release. It prompts for the updater-key password locally and never uploads the private key or password.

The individual setup and release stages are documented below for recovery and troubleshooting.

1. Create a public GitHub repository named `INotKazu/Squadra-Presence`.
2. Run `npm install`, then run this once:

   ```powershell
   .\Setup-Updater.ps1
   ```

3. Back up the private key printed by the script. It stays under your Windows local app-data folder and must never be committed, uploaded, pasted into chat, or shared. Losing it means existing installations cannot trust future update packages.
4. Build the installer and signed updater artifacts with:

   ```powershell
   .\Build-Release.ps1
   ```

5. Assemble the three GitHub release files with:

   ```powershell
   .\Prepare-GitHub-Release.ps1
   ```

6. Create the matching GitHub release tag, such as `v0.6.2`, and upload the prepared NSIS installer, its `.sig`, and `latest.json` from `release-output`.

To create/update the public repository and upload all three signed assets without using the GitHub website manually, install [GitHub CLI](https://cli.github.com/), run `gh auth login` once as **INotKazu**, then run:

```powershell
.\Publish-GitHub.ps1
```

The publisher verifies the connected account and repository target, refuses to stage private keys or generated build folders, pushes the clean source to `main`, and creates or refreshes the matching GitHub release. GitHub Actions then runs the JavaScript/TypeScript tests and frontend build on future pushes. Windows updater signing remains local and never runs in GitHub Actions.

Tauri verifies every downloaded artifact against the embedded public key before installation. This updater signature is separate from an optional Windows Authenticode certificate, so an unsigned personal build can still show the normal SmartScreen warning on its first manual install.

## Automatic startup and tray behavior

- **Launch hidden with Windows** keeps the lightweight companion ready in the notification area after sign-in.
- **Start and stop with the game** broadcasts presence when a matching Squadra process appears and clears it when the process closes.
- Closing the window hides it to the system tray. Left-click the tray icon, or choose **Open Squadra Presence**, to restore it.
- Choose **Quit** from the tray menu to exit the companion completely.
- Starting the executable again focuses the existing window instead of creating a second background copy.

The companion remains in the tray after the game closes. Windows cannot automatically launch this independent fan app from the game itself, so the hidden login launch is what lets it notice future game sessions without manual startup.

## Browser-only UI preview

The complete UI can be viewed without the Rust desktop runtime:

```powershell
npm run dev
```

This mode uses demo tracker data and simulates Discord status. Native process detection and Discord IPC require the Tauri desktop runtime.

## Tracker behavior

- A profile is loaded once on startup.
- When **Automatic tracker sync** is enabled, the app checks once every two minutes while a matching game process is running.
- The default process hints are `gekishin`, `squadra`, `dbgs`, and `game.exe`; they can be edited in Settings.
- Concurrent requests are blocked. If DBGS Builds returns HTTP 429, automatic sync pauses for five minutes and doubles the pause after repeated 429s, up to 30 minutes.
- A 429 is not an app or Discord failure. The last successful tracker result remains active until the next successful refresh.
- The community endpoint can change. Errors stay visible in the UI and manual mode remains usable.

Please keep the polling interval conservative and obtain permission from the DBGS Builds operators before distributing this at scale.

## Builds, cards, and fighter reference

- Open **Builds** from the dashboard header, then search or select any fighter from the roster.
- **Recommended build** shows the current three-card and Helper reference attributed to DBGS Builds.
- **Kazuma's Picks** is a separate, bundled creator collection and is never presented as DBGS advice.
- Hover a card—or focus it with the keyboard—to see a concise effect summary.
- **Full guide** optionally loads situational cards/Helpers, explanation, skill order, team recommendations, and matchup references from that fighter's published DBGS guide.
- **Save a copy** starts from the recommendation; **New build** creates a blank loadout. The editor enforces one choice from Card 1, Card 2, and Card 3.
- Custom names, three card choices, compatible Helper, and notes are saved locally per fighter. They are not uploaded anywhere.
- **Share** creates an `SPB1` code; **Import code** validates a received code before adding it to the local library.
- **Skills & Passives** retrieves public reference descriptions only when that tab is opened or manually refreshed, then keeps them in the local seven-day cache.

## History and backups

- Open **History** from the dashboard header to view tracker matches saved on this PC, season and role filters, and Damage/Tank/Technical RP trends.
- Each successful tracker sync merges up to the latest 20 completed matches without duplicating existing journal entries and enriches previously saved rows when DBGS later supplies MVP or RP details. The local journal retains up to 50 matches and 100 RP observations per season and public UUID.
- Each role trend counts only that role's score changes; an untouched role correctly says there is no RP movement yet.
- Each season keeps its own 50-match and 100-observation allowance. A season update adds the official boundary to the app's season catalog, preserving the old journal while starting the new RP graph cleanly. **Career** combines match summaries but deliberately does not connect RP scores across season resets.
- Void/cancelled results remain visible in the archive as yellow neutral rows but are excluded from win rate, performance averages, MVP totals, and most-played calculations.
- Click a completed match to open its full local detail drawer. MVP and per-match RP are shown only when explicitly supplied by the public tracker.
- Open **Settings → Backup and restore** to export or restore settings, custom builds, Helper choices, learned RP gain samples, and local journals.
- Backup format v3 includes every season journal alongside local Kazuma's Pick edits and Star reward notes; v1 and v2 backups remain importable. Restoring a backup replaces those local collections. A backup contains the public UUID, so it should not be posted publicly.

## Star Collection and player profile

- Open **Star** from the dashboard header to view the tracker's Star Collection level, Total Votes Received, Zeni, and overall Player Rank.
- When the public tracker exposes the level, the app updates it during normal sync. Manual correction remains available as a fallback.
- The roadmap contains every supplied current in-game reward from Level 1 through the fixed Level 255 cap, plus expandable Tier IV, III, II, and I Hero Unlock pools covering the 36 supplied unlockable fighters.
- Any reward row can be edited locally and reset later; those notes are included in backup format v3.

## KazuCorp startup sequence

- A manual cold launch shows **KazuCorp Systems → Squadra Link Initialized** and plays an original short synthesized chime.
- Hidden Windows-login launches and tray restores skip both animation and audio.
- The animation and chime can be disabled independently in Settings.

Recommendations and card effects are reference data that can change after balance updates. The in-game descriptions remain authoritative.

## Fighters, Helpers, and Discord art

Version 0.6 includes transparent local artwork for all 40 current heroes. Bardock keeps the custom Ultra Instinct (Sign) artwork and now has a transparent coral/teal offset outline; the other roster entries use individual renders from the official hero pages.

If `character_bardock` already exists in Discord, delete it and upload the corrected file from `Discord-Uploads/UPLOAD_UPDATED_BARDOCK_ASSET` under **Rich Presence → Art Assets**. Discord asset keys cannot be edited in place, and the required key remains `character_bardock`.

Upload in small batches if Discord rate-limits the portal. Asset updates can also take several minutes to appear because Discord caches Rich Presence art. Asset keys cannot be renamed in place; delete and re-upload an asset if its key is wrong.

The 18 Helper portraits are bundled UI art and do not require Discord uploads. Discord Rich Presence provides one large and one small image: the fighter uses the large slot and the rank badge uses the small slot. The equipped Helper is therefore included in the presence text and hover text while its portrait remains visible in the companion dashboard.

Helpers are role-specific. Selecting a fighter immediately selects that fighter's official role and the matching role rank. The Helper picker then shows only the six compatible choices and remembers the selection separately for that fighter. See `ASSET_KEYS.md` for the complete catalog.

For a future hero:

1. Prepare a transparent 1024×1024 PNG.
2. Upload it with a stable `character_...` key.
3. Add the fighter, official tracker-name aliases, role, key, and local portrait path to `src/lib/characters.ts`.
4. Put the local image under `public/assets/characters/`.

## Verification

```powershell
npm test
npm run build
```

The TypeScript/Vite production build and automated mapping tests can run on any supported Node platform. The native Windows installer must be compiled on a machine with Rust and the Windows toolchain.

## Project layout

- `src/` — React dashboard, tracker normalization, rank mapping, IPC bridge
- `src/components/BuildsWorkspace.tsx` — build library, card editor, and ability-reference workspace
- `src/components/HistoryWorkspace.tsx` — local match summaries and RP trend workspace
- `src/lib/cards.ts` — 18-card effect catalog
- `src/lib/kazumaPicks.ts` — bundled creator-curated loadouts and personal notes
- `src/lib/reference.ts` — fighter reference IDs and recommended loadouts
- `src/lib/progress.ts` — RP progress and learned win-gain estimates
- `src/lib/buildShare.ts` — private-data-free portable build codes
- `src/lib/backup.ts` and `src/lib/journal.ts` — local export/restore and per-player history
- `src-tauri/src/discord.rs` — persistent Discord IPC worker
- `src-tauri/src/tracker.rs` — public tracker request, response sanitization, and ability-reference fetcher
- `src-tauri/src/process.rs` — safe process-name detection
- `public/assets/characters/` — all 40 bundled fighter portraits
- `public/assets/ranks/` — all 16 rank badges
- `public/assets/helpers/` — all 18 role-filtered Helper portraits
- `public/assets/cards/` — all 18 Season 6 card portraits

## Legal

Squadra Presence is **source-visible proprietary software**, not an open-source project. The official compiled app may be used personally and non-commercially, but the source or application may not be repackaged, modified, redistributed, or presented as another official release without prior written permission.

- Read the [Squadra Presence Personal-Use License](LICENSE).
- Read the [Squadra Presence and KazuCorp Brand Policy](BRAND_POLICY.md).
- Read the [third-party notices](THIRD_PARTY_NOTICES.md).

Official releases come only from [`INotKazu/Squadra-Presence`](https://github.com/INotKazu/Squadra-Presence) and in-app updates must pass the embedded updater-signature check.

This is an unofficial fan project and is not affiliated with or endorsed by Bandai Namco Entertainment, Bird Studio/Shueisha, Toei Animation, Discord, or DBGS Builds. Dragon Ball and other third-party names, artwork, characters, and trademarks remain the property of their respective owners. Do not represent this project as an official game client.
