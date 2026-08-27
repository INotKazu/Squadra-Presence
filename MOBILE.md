# Squadra Companion mobile port

The mobile target shares the same React, tracker, journal, Star Collection, builds, cards, Helpers, abilities, Kazuma's Picks, and backup code as Squadra Presence. Desktop-only services are compiled only for desktop builds.

## Included on Android and iOS

- Public DBGS tracker sync, profile, ranks, latest completed match, and rate-limit backoff
- Season journals, career summaries, match details, MVP/VOID handling, and RP graphs
- Star Collection Levels 1–255, Total Votes, Zeni, player rank, and unlock pools
- Fighter builds, card library, Helpers, abilities, expanded guides, and Kazuma's Picks
- Manual fighter/rank controls and the four-second KazuCorp intro
- Backup restore from desktop and mobile backup sharing/download
- A phone-specific dashboard, touch targets, full-screen workspaces, and safe-area navigation

## Deliberately excluded on mobile

- Discord Rich Presence and Discord IPC
- Windows game-process detection
- Tray and Windows-login startup
- The desktop GitHub updater

Those services remain unchanged in Windows builds. Mobile updates will use a new APK during private testing, then Google Play or TestFlight/App Store distribution later.

## Fastest beta build: GitHub Actions

Every push to `feature/mobile-companion` runs **Build Android beta** on GitHub. Open the completed workflow run, download the `squadra-companion-android-beta` artifact, unzip it, and copy the APK to the Android phone. This does not publish a GitHub Release or affect desktop users.

## Optional local Android build on Windows

1. Install Android Studio.
2. In **SDK Manager**, install Android SDK Platform, Platform-Tools, NDK (Side by side), Build-Tools, and Command-line Tools.
3. Reopen PowerShell so Android Studio and Java are visible.
4. Open PowerShell in this repository and run:

   ```powershell
   .\Build-Android-Beta.ps1
   ```

The script detects the standard Android Studio locations, adds all four Rust Android targets, initializes `src-tauri\gen\android` on the first run, runs the full test suite, and creates an installable debug APK. It prints the exact APK path when finished. You do not need this local setup just to download the GitHub Actions beta.

If Android Studio was installed somewhere custom, set `JAVA_HOME`, `ANDROID_HOME`, and `NDK_HOME` for that location before rerunning the script.

## Move existing PC data to a phone

1. On Windows, open **Settings → Backup and restore → Export**.
2. Move the private JSON file to the phone. Do not post it publicly; it contains the public tracker ID.
3. On the phone, open **Settings → Backup and restore → Restore** and choose that JSON file.
4. The app reloads with the same settings, custom builds, Helper choices, journal, rank observations, Kazuma's Picks edits, and Star reward notes.

Live tracker sync continues directly from the phone using the public tracker ID. The game does not need to be running on the same device.

## iOS status

The source and native feature boundary are iOS-ready, and `tauri.ios.conf.json` is included. Generating, signing, and testing the Xcode project requires a Mac with Xcode and CocoaPods. App Store/TestFlight distribution also requires Apple Developer enrollment. Android is the first beta target so phone behavior can be validated before that signing step.
