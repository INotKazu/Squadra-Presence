# Changelog

## 0.6.2

- Extended the manual KazuCorp cold-launch sequence from 3.2 to 4 seconds while preserving hidden-startup and tray-restore skipping.
- Fixed Damage and Technical RP trend charts accidentally filling the SVG line, which created large colored wedges whenever RP dropped and recovered.
- Displays `VOID`, cancelled, draw, and no-contest results as neutral yellow outcomes and excludes them from win-rate, average-performance, MVP, and most-played calculations.
- Added season-aware History journals with a current-season tab, preserved archived-season tabs, and a Career match view that never connects RP graphs across scheduled rank resets.
- Migrates existing local history into Season 6 automatically and upgrades backups to format v3 while retaining v1 and v2 restore compatibility.
- Added the Squadra Presence Personal-Use License and KazuCorp Brand Policy, including explicit protection for the official Discord identity and signed update channel.
- Added `Release-All.ps1`, a guarded one-command Windows workflow that tests, builds, signs, prepares, and publishes a complete updater release while keeping the private key local.
- Expanded the frontend regression suite to 57 tests, including neutral VOID scoring, legacy season migration, archived-season filtering, and SVG trend-line rendering.

## 0.6.1

- Fixed DBGS Star Collection syncing by reading the current `collection.actual` tracker field; levels are capped to the current in-game maximum of 255.
- Added the complete supplied Level 1–255 reward roadmap, including G-Capsules, Super G-Capsules, Helpers, emotes, and every Hero Unlock milestone.
- Added current Hero Unlock pool details for all 36 supplied Tier IV, III, II, and I fighters.
- Fixed MVP trophies by honoring the tracker’s explicit match-level `mvp` value, and automatically enriches matching History rows that were saved before the field was recognized.
- Added support for the tracker’s current Total Votes field while retaining compatibility with descriptive field names.
- Added Star level, Total Votes, and Zeni directly to the main dashboard’s player-profile button while keeping the expanded profile inside Star Collection.
- Extended the manual cold-launch sequence from 2.6 to 3.2 seconds, preserving the existing animation, sound, and tray-start behavior.
- Added a guarded one-command GitHub publisher plus a read-only CI verification workflow; updater signing keys remain local and excluded from publication.
- Expanded the frontend regression suite to 52 tests, including current DBGS payload shapes, MVP repair, the 255 cap, and all four Hero Unlock pools.

## 0.6.0

- Added a tracker-linked Star Collection workspace with current level, Total Votes Received, Zeni, overall player rank, editable reward milestones, and a full level roadmap that never invents missing reward data.
- Added explicit MVP badges and per-match detail drawers in History, including time, mode, KOs, assists, damage, fighter level, duration, RP change, and captured loadout IDs when the tracker reports them.
- Made Kazuma's Picks editable on each PC: title, three cards, compatible Helper, summary, and “Why Kazuma picks it” note can be changed locally or reset to the bundled KazuCorp version.
- Upgraded backups to format v2 so Star reward notes and Kazuma's Pick overrides are preserved; v1 backups remain importable.
- Added the KazuCorp Systems cold-launch sequence with an original synthesized chime. Hidden Windows startup and tray restores skip the sequence automatically, and both animation and sound are optional.
- Added a signed Tauri updater backed by `INotKazu/Squadra-Presence` GitHub Releases, with a green release banner, release notes, progress, remind-later, and skip-version controls.
- Added safe PowerShell workflows to generate and protect the permanent updater key, build signed update artifacts, and prepare `latest.json` plus the Windows release files.
- Preserved all v0.5.2 UI corrections: nickname-derived preview initial, role-specific RP observations, centered role icons, and human-readable Character/Rank/Helper readiness labels.
- Expanded the frontend regression suite to 47 tests.

## 0.5.2

- Replaced the hardcoded `K` in the in-app Discord preview with the synced player's nickname initial.
- Corrected History rank observations so each role counts only that role's actual score movement.
- Scoped trend-chart SVG styling so the Damage role icon no longer appears as an oversized red circle and all role icons remain centered.
- Replaced Discord asset-key readiness text with the active Character name, Rank, and selected Helper or `None selected`.

## 0.5.1

- Added the complete 40-fighter live ranking-ID table published by the DBGS player tracker, so matches without a `character_name` no longer fall back to Unknown Fighter.
- Confirmed and fixed the newly observed Hit, Piccolo, Majin Buu (Pure), and Frieza (Fourth Form) tracker IDs.
- Automatically repairs previously saved Unknown Fighter history rows, including their correct fighter name, artwork, and official role.
- Preserved the older `hero-####` identifiers internally so existing settings, custom builds, and share codes remain compatible.
- Expanded the regression suite to 42 tests.

## 0.5.0

- Added portable `SPB1` build codes that share only the fighter, cards, compatible Helper, name, and notes—never the player ID or app settings.
- Added a built-in **Kazuma's Picks** collection for Bardock, Broly, and Goku Black, including personal “Why Kazuma picks it” notes recovered from the original solo-queue build discussion.
- Added an optional expanded DBGS guide view with situational cards and Helpers, build explanations, skill upgrade order, recommended teammates, and strong/weak matchups cached for seven days.
- Added a local per-player battle journal with up to 50 recent tracker matches, role filters, win rate and performance summaries, and RP trend charts.
- Added JSON backup and restore for settings, custom builds, Helper choices, rank-gain samples, and local history, with an explicit warning that backups contain the public player ID.
- Kept the existing in-app rank progress and wins estimate, Discord presence behavior, tray automation, and distribution-safe blank-ID first launch.
- Expanded the frontend regression suite to 37 tests.

## 0.4.1

- Added the requested Kazuma, `kazumavt`, and KazuCorp creator credit to the sidebar footer.
- Removed the creator's public tracker UUID from fresh-install defaults and automatically opens Settings on first desktop launch.
- Changed Windows-login launch to opt-in for new installations; existing saved settings remain unchanged during an upgrade.

## 0.4.0

- Added in-app RP progress bars for Damage, Tank, and Technical ranks.
- Added exact division RP earned and remaining, plus a clearly marked approximate wins-to-rank value learned from recent positive RP gains.
- Added a searchable full-roster Builds workspace accessible from the dashboard header.
- Added all 18 Season 6 cards with portraits and effect summaries on mouse hover or keyboard focus.
- Added current three-card and compatible-Helper recommendations for all 40 fighters, attributed to DBGS Builds.
- Added a local per-fighter build library with custom names, one card per slot, compatible Helper selection, notes, editing, and deletion.
- Added a Skills & Passives tab that retrieves current public fighter reference text on demand and caches it locally for seven days.
- Added tests for the card catalog, recommendation coverage, role compatibility, and rank-progress calculations. The frontend suite now contains 29 tests.

## 0.3.0

- Tied every manual or tracked fighter to its official Damage, Tank, or Technical role automatically.
- Automatically selects that role's tracked rank when switching fighters while tracker data is available.
- Added all 18 Helpers from the DBGS Builds Helper effect list, six per role.
- Added role-filtered Helper selection, per-fighter Helper memory, effects, portraits, and presence text.
- Set Dende as Bardock's default Helper while keeping incompatible Helpers hidden.
- Replaced Bardock's art with a genuinely transparent version using the requested coral/teal offset outline.
- Added automatic presence start and clear when the game process opens and closes.
- Added optional hidden Windows-login launch, close-to-tray behavior, tray Open/Quit actions, and single-instance protection.
- Preserved the rank badge as Discord's small image; Helper information uses text because Rich Presence has only one small-image slot.
- Added helper-catalog and stale-role regression tests.

## 0.2.2

- Added the fighter role to Discord's visible activity line, such as `ROLE DAMAGE │ RANK A4`.
- Updated the in-app Discord preview to match the real presence text.

## 0.2.1

- Fixed the Role Rank Source cards collapsing when the full 40-character selector is displayed.
- Kept the character selector contained within its own horizontally scrollable column.

## 0.2.0

- Added local preview art and Discord asset-key mappings for all 40 current playable heroes.
- Added tracker-name and alias matching so new or previously unknown DBGS character IDs can resolve to the correct fighter.
- Added Jiren (Full Power), Goku Black, and Beerus from the current Season 6 roster.
- Kept the custom Ultra Instinct (Sign) Bardock art and label.
- Expanded the manual fighter strip to a horizontally scrollable full-roster picker.
- Added fighter portraits to the latest-match card.
- Changed automatic tracker polling from 60 seconds to two minutes.
- Prevented overlapping tracker requests.
- Added automatic 5–30 minute exponential cooldown after HTTP 429 responses while retaining the last successful profile.
- Added `game.exe` to the default safe process-name hints.

## 0.1.0

- Initial Tauri desktop companion, Discord Rich Presence, tracker integration, Bardock art, and 16 rank badges.
