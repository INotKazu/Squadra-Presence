import { useRef, useState } from "react";
import { Download, RefreshCw, Share2, Upload, X } from "lucide-react";
import { exportAppBackup, restoreAppBackup } from "../lib/backup";
import { CHARACTERS, getCharacter } from "../lib/characters";
import { roleLabel } from "../lib/ranks";
import type { AppSettings } from "../types";

interface SettingsPanelProps {
  settings: AppSettings;
  mobileRuntime?: boolean;
  onChange: (settings: AppSettings) => void;
  onSelectCharacter: (characterRankingId: string) => void;
  onCheckUpdates: () => Promise<void>;
  updateChecking: boolean;
  onClose: () => void;
}

export function SettingsPanel({ settings, mobileRuntime = false, onChange, onSelectCharacter, onCheckUpdates, updateChecking, onClose }: SettingsPanelProps) {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });
  const selectedCharacter = getCharacter(settings.characterRankingId);

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm("Restore this backup? Current settings, saved builds, and local history will be replaced.")) return;
    try {
      const restored = restoreAppBackup(await file.text());
      onChange(restored.settings);
      setBackupMessage("Backup restored. Reloading the companion…");
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  };

  const exportBackup = async () => {
    try {
      const result = await exportAppBackup(settings, mobileRuntime);
      setBackupMessage(result === "shared" ? "Backup shared." : "Backup downloaded.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setBackupMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="settings-scrim" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="settings-panel" aria-label="Settings">
        <div className="settings-title">
          <div>
            <span className="eyebrow">{mobileRuntime ? "Squadra Companion" : "Squadra Presence"}</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings"><X /></button>
        </div>

        <label>
          <span>Public player ID</span>
          <input
            value={settings.publicId}
            onChange={(event) => update("publicId", event.target.value)}
            spellCheck={false}
          />
          <small>Only this public ID is sent to DBGS Builds. Your player code is never used.</small>
        </label>

        <div className="settings-two-column">
          <label>
            <span>Display source</span>
            <select value={settings.source} onChange={(event) => update("source", event.target.value as AppSettings["source"])}>
              <option value="manual">Manual selection</option>
              <option value="tracker">Latest tracked match</option>
            </select>
          </label>
          <label>
            <span>Fighter role</span>
            <select value={selectedCharacter.defaultRole} disabled>
              <option value={selectedCharacter.defaultRole}>{roleLabel(selectedCharacter.defaultRole)} — automatic</option>
            </select>
          </label>
        </div>

        <label>
          <span>Manual character</span>
          <select
            value={settings.characterRankingId}
            onChange={(event) => onSelectCharacter(event.target.value)}
            disabled={settings.source === "tracker"}
          >
            {CHARACTERS.map((character) => (
              <option key={character.rankingId} value={character.rankingId}>{character.label}</option>
            ))}
          </select>
        </label>

        {!mobileRuntime && (
          <label>
            <span>Game process hints</span>
            <input
              value={settings.processHints.join(", ")}
              onChange={(event) => update("processHints", event.target.value.split(",").map((part) => part.trim()).filter(Boolean))}
            />
            <small>Comma-separated name fragments. Detection never reads game memory.</small>
          </label>
        )}

        <div className="toggle-list">
          <label className="toggle-row">
            <div><strong>Automatic tracker sync</strong><small>{mobileRuntime ? "Refresh every two minutes while the companion is open, and once whenever you return to it." : "Refresh every two minutes while the game is running, with automatic backoff if the tracker is busy."}</small></div>
            <input type="checkbox" checked={settings.autoSync} onChange={(event) => update("autoSync", event.target.checked)} />
            <span className="switch" />
          </label>
          {!mobileRuntime && (
            <>
              <label className="toggle-row">
                <div><strong>Start and stop with the game</strong><small>Enable presence when Squadra opens and clear it when the game closes.</small></div>
                <input type="checkbox" checked={settings.autoPresenceWithGame} onChange={(event) => update("autoPresenceWithGame", event.target.checked)} />
                <span className="switch" />
              </label>
              <label className="toggle-row">
                <div><strong>Launch hidden with Windows</strong><small>Keep the companion ready in the system tray, so it can detect Squadra without manual startup.</small></div>
                <input type="checkbox" checked={settings.launchAtLogin} onChange={(event) => update("launchAtLogin", event.target.checked)} />
                <span className="switch" />
              </label>
              <label className="toggle-row">
                <div><strong>Only while game is running</strong><small>Clear presence when the process closes.</small></div>
                <input type="checkbox" checked={settings.onlyWhileGameRunning} onChange={(event) => update("onlyWhileGameRunning", event.target.checked)} />
                <span className="switch" />
              </label>
            </>
          )}
          <label className="toggle-row">
            <div><strong>KazuCorp startup sequence</strong><small>{mobileRuntime ? "Show the four-second animated Squadra Link screen once when the app opens." : "Show the animated Squadra Link screen on a manual cold launch. Hidden Windows startup and tray restores skip it."}</small></div>
            <input type="checkbox" checked={settings.startupAnimation} onChange={(event) => update("startupAnimation", event.target.checked)} />
            <span className="switch" />
          </label>
          <label className="toggle-row">
            <div><strong>Startup synth chime</strong><small>Play the original KazuCorp tone with the startup sequence.</small></div>
            <input type="checkbox" checked={settings.startupSound} onChange={(event) => update("startupSound", event.target.checked)} disabled={!settings.startupAnimation} />
            <span className="switch" />
          </label>
          {!mobileRuntime && (
            <label className="toggle-row">
              <div><strong>Automatically check for updates</strong><small>Check KazuCorp's signed GitHub releases after startup. Nothing installs until you click Install update.</small></div>
              <input type="checkbox" checked={settings.autoCheckUpdates} onChange={(event) => update("autoCheckUpdates", event.target.checked)} />
              <span className="switch" />
            </label>
          )}
        </div>

        {!mobileRuntime && (
          <div className="settings-updates">
            <div><strong>Application updates</strong><small>Update packages must pass Tauri's embedded signature check before installation.</small></div>
            <button type="button" disabled={updateChecking} onClick={() => void onCheckUpdates()}><RefreshCw className={updateChecking ? "spin" : ""} /> {updateChecking ? "Checking" : "Check now"}</button>
          </div>
        )}

        <div className="settings-backup">
          <div>
            <strong>Backup and restore</strong>
            <small>Save settings, custom builds, editable Kazuma's Picks, Star reward notes, Helper choices, and local match/rank history. {mobileRuntime ? "Use this file to move your companion data between PC and phone." : "The backup contains your public player ID, so share build codes instead of sharing this file."}</small>
          </div>
          <div className="settings-backup-actions">
            <button type="button" onClick={() => void exportBackup()}>{mobileRuntime ? <Share2 size={15} /> : <Download size={15} />} {mobileRuntime ? "Share backup" : "Export"}</button>
            <button type="button" onClick={() => backupInputRef.current?.click()}><Upload size={15} /> Restore</button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => void importBackup(event.target.files?.[0])}
            />
          </div>
          {backupMessage && <span className="settings-backup-message">{backupMessage}</span>}
        </div>

        <div className="settings-note">
          The role is tied to the selected fighter automatically. Helpers are filtered by that role and remembered separately for every fighter. Tracker sync still reflects completed matches rather than live game memory.
        </div>

        <button className="primary-button settings-done" type="button" onClick={onClose}>Save & close</button>
      </section>
    </div>
  );
}
