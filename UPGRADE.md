# Upgrade Squadra Presence to 0.6.1

## 1. Discord assets

No Discord Art Asset changes are required when upgrading from 0.5.1 or 0.5.2. Star Collection, MVP detail, editable Kazuma's Picks, the KazuCorp splash, and updates are displayed only inside the desktop companion.

Fresh installations open Settings with an empty public player ID and leave Windows-login launch disabled. Upgrading an existing installation keeps its saved ID and startup choice.

## 2. Build the updated Windows app

Exit the currently running Squadra Presence app. Extract the new source folder somewhere on the fast X: drive, then open PowerShell inside it.

For a normal local build without automatic updates:

```powershell
npm install
npm test
npm run tauri build
```

For the recommended signed update-enabled build, run:

```powershell
npm install
.\Setup-Updater.ps1
.\Build-Release.ps1
```

`Setup-Updater.ps1` reuses the permanent private signing key created for v0.6.0 and copies its public half into this source folder. Back that key up securely and never share it. PowerShell deliberately displays no characters while you enter its password.

The updated installer appears under:

`src-tauri\target\release\bundle`

Run `Squadra Presence_0.6.1_x64-setup.exe` from the `nsis` folder for a manual test. It upgrades the existing application and keeps the same Discord application ID and local settings.

## 3. Verify

1. Start Discord desktop.
2. Start DRAGON BALL GEKISHIN SQUADRA.
3. Open Squadra Presence once and confirm **Launch hidden with Windows** and **Start and stop with the game** are enabled in Settings.
4. Click **Sync now** once.
5. Confirm the active role's RP bar shows the exact current division progress, and that untouched roles say **No RP movement recorded yet**.
6. Open **Builds**, select Bardock, Broly, or Goku Black, and confirm **Kazuma's Picks** appears with its personal note.
7. Save a copy, share it, and import the `SPB1` code to confirm the portable exchange works.
8. Open **Full guide**, then **Skills & Passives**, and confirm both public references load.
9. Open **History** after a successful sync, confirm the tracker’s trophy matches show an MVP badge (including matching rows saved by v0.6.0), and click a match to open its detail drawer.
10. Open **Star** and confirm Star Collection, Votes, Zeni, and overall Player Rank match the public tracker. Expand the four Hero Unlock pools and confirm the roadmap ends at Level 255.
11. Edit one Star reward and one Kazuma's Pick, then export a backup from Settings.
12. Close the companion window and restore it from the system tray; the KazuCorp splash should not replay.
13. Confirm the fighter portrait, role, rank, Helper text, and elapsed time still appear on Discord.

If DBGS Builds returns HTTP 429, leave the app open and wait for the displayed cooldown. Version 0.6.1 keeps the last successful result active and resumes automatically instead of repeatedly retrying.

Version 0.6.0 remains the stable rollback. After building v0.6.1, run `Prepare-GitHub-Release.ps1`, create GitHub release tag `v0.6.1` in `INotKazu/Squadra-Presence`, and upload all three generated files. Existing v0.6.0 installations can then discover and install v0.6.1 from the green in-app update banner.
