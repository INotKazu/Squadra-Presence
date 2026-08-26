import { DownloadCloud, FileText, SkipForward, X } from "lucide-react";
import type { UpdateMetadata } from "../types";

interface UpdateBannerProps {
  update: UpdateMetadata;
  installing: boolean;
  downloaded: number;
  total: number | null;
  onInstall: () => void;
  onLater: () => void;
  onSkip: () => void;
}

export function UpdateBanner({ update, installing, downloaded, total, onInstall, onLater, onSkip }: UpdateBannerProps) {
  const progress = total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null;
  return (
    <section className="update-banner" aria-live="polite">
      <div className="update-banner-icon"><DownloadCloud /></div>
      <div className="update-banner-copy">
        <span>New update ready</span>
        <strong>Squadra Presence v{update.version}</strong>
        <p>{installing ? progress === null ? "Downloading and verifying the signed update…" : `Downloading and verifying… ${progress}%` : update.notes || "A new KazuCorp release is available."}</p>
        {installing && <div className="update-progress"><i style={{ width: `${progress ?? 12}%` }} /></div>}
      </div>
      {!installing && <div className="update-banner-actions">
        <button type="button" className="install" onClick={onInstall}><DownloadCloud /> Install update</button>
        <button type="button" title="Skip this version" onClick={onSkip}><SkipForward /></button>
        <button type="button" title="Remind me later" onClick={onLater}><X /></button>
      </div>}
      {update.notes && !installing && <details><summary><FileText /> Release notes</summary><p>{update.notes}</p></details>}
    </section>
  );
}

