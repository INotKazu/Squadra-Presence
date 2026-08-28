import { Check, Clipboard, MonitorUp, Power, RefreshCcw, X } from "lucide-react";
import { useState } from "react";
import { isTauri } from "../lib/bridge";
import { roleLabel } from "../lib/ranks";
import type { OverlayServerStatus, OverlaySnapshot } from "../types";

interface OverlayWorkspaceProps {
  snapshot: OverlaySnapshot;
  status: OverlayServerStatus;
  characterPortrait?: string;
  rankPortrait?: string;
  onToggle: (enabled: boolean) => void;
  onResetSession: () => void;
  onClose: () => void;
}

export function OverlayWorkspace({
  snapshot,
  status,
  characterPortrait,
  rankPortrait,
  onToggle,
  onResetSession,
  onClose,
}: OverlayWorkspaceProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(status.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="overlay-console-scrim" role="dialog" aria-modal="true" aria-label="OBS overlay control">
      <section className="overlay-console">
        <header className="overlay-console-header">
          <div className="overlay-console-title">
            <span><MonitorUp /></span>
            <div><small>KazuCorp creator tools</small><h1>OBS Battle Overlay</h1><p>Transparent live session HUD for recordings and streams.</p></div>
          </div>
          <button type="button" className="builds-close" onClick={onClose} aria-label="Close OBS overlay control"><X /></button>
        </header>

        <div className="overlay-console-body">
          <section className="overlay-preview-panel">
            <div className="overlay-section-heading">
              <div><span className="eyebrow">Live browser source</span><h2>Compact ranked card</h2></div>
              <span className={`overlay-server-pill ${status.running ? "online" : "offline"}`}><i />{status.running ? "Local server online" : "Server unavailable"}</span>
            </div>
            <div className="overlay-preview-stage">
              {isTauri() && status.running ? (
                <iframe src={status.url} title="Live Squadra OBS overlay preview" width="760" height="190" />
              ) : (
                <div className="overlay-preview-fallback">
                  {characterPortrait && <img className="overlay-preview-fighter" src={characterPortrait} alt="" />}
                  <div><small>KazuCorp ranked link</small><h3>{snapshot.characterName}</h3><span>{roleLabel(snapshot.role)} • {snapshot.wins}W–{snapshot.losses}L • {snapshot.rpDelta >= 0 ? "+" : ""}{snapshot.rpDelta} RP</span></div>
                  {rankPortrait && <img className="overlay-preview-rank" src={rankPortrait} alt="" />}
                </div>
              )}
            </div>
            <p className="overlay-preview-note">The card has a fully transparent background. The checkerboard is preview-only and will not appear over gameplay.</p>
          </section>

          <aside className="overlay-setup-panel">
            <div className="overlay-section-heading"><div><span className="eyebrow">One-time setup</span><h2>Add to OBS</h2></div></div>
            <ol className="overlay-steps">
              <li><b>1</b><span>In OBS, press <strong>+</strong> under Sources and choose <strong>Browser</strong>.</span></li>
              <li><b>2</b><span>Paste the local URL below.</span></li>
              <li><b>3</b><span>Set width to <strong>760</strong> and height to <strong>190</strong>.</span></li>
              <li><b>4</b><span>Place it in a corner, then lock the source.</span></li>
            </ol>

            <label className="overlay-url-field">
              <span>Browser source URL</span>
              <div><input value={status.url} readOnly spellCheck={false} /><button type="button" onClick={() => void copyUrl()} disabled={!status.running}>{copied ? <Check /> : <Clipboard />}{copied ? "Copied" : "Copy"}</button></div>
            </label>

            {status.error && <p className="overlay-server-error">{status.error}</p>}

            <div className="overlay-actions">
              <button type="button" className={snapshot.enabled ? "overlay-power active" : "overlay-power"} onClick={() => onToggle(!snapshot.enabled)}>
                <Power /> <span><strong>{snapshot.enabled ? "Overlay visible" : "Overlay hidden"}</strong><small>{snapshot.enabled ? "OBS is receiving the live card" : "The browser source stays transparent"}</small></span>
              </button>
              <button type="button" className="overlay-reset" onClick={onResetSession}><RefreshCcw /><span><strong>Reset session</strong><small>Start W–L and RP from zero</small></span></button>
            </div>

            <p className="overlay-privacy-note">Only your PC can open this address. Keep Squadra Presence running in the tray while OBS is using it.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
