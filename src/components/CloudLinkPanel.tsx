import { useState } from "react";
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import {
  clearCloudLinkState,
  CloudSyncConflictError,
  createCloudLinkState,
  downloadCloudCopy,
  loadCloudLinkState,
  saveCloudLinkState,
  syncCloudCopy,
  uploadThisDevice,
  verifyCloudEndpoint,
  type CloudLinkState,
  type CloudSyncResult,
} from "../lib/cloudLink";
import { formatCloudLinkCode, generateCloudLinkCode, isValidCloudLinkCode } from "../lib/cloudCrypto";
import type { AppSettings } from "../types";

interface CloudLinkPanelProps {
  settings: AppSettings;
  mobileRuntime: boolean;
  onSettingsChange: (settings: AppSettings) => void;
}

type CloudAction = "link" | "sync" | "upload" | "download" | null;

function formattedSyncTime(value: string | null): string {
  if (!value) return "Never synced";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? `Last synced ${new Date(timestamp).toLocaleString()}` : "Previously synced";
}

export function CloudLinkPanel({ settings, mobileRuntime, onSettingsChange }: CloudLinkPanelProps) {
  const [linkState, setLinkState] = useState<CloudLinkState>(() => loadCloudLinkState());
  const [endpointDraft, setEndpointDraft] = useState(linkState.endpoint);
  const [codeDraft, setCodeDraft] = useState(linkState.linkCode);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState<CloudAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const linked = isValidCloudLinkCode(linkState.linkCode) && Boolean(linkState.endpoint);

  const remember = (state: CloudLinkState) => {
    const saved = saveCloudLinkState(state);
    setLinkState(saved);
    setEndpointDraft(saved.endpoint);
    setCodeDraft(saved.linkCode);
    return saved;
  };

  const pair = async (code: string) => {
    if (busy) return null;
    setBusy("link");
    setMessage("Checking the secure cloud vault…");
    try {
      const verifiedEndpoint = await verifyCloudEndpoint(endpointDraft);
      const next = remember(createCloudLinkState(verifiedEndpoint, code));
      setMessage("Device linked locally. Upload from the device with the data you want to keep, then download on the other device.");
      setConflict(false);
      setShowCode(true);
      return next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const generate = () => {
    const generated = generateCloudLinkCode();
    setCodeDraft(generated);
    void pair(generated);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(formatCloudLinkCode(linkState.linkCode));
      setMessage("Private link code copied. Send it only to a device you trust.");
    } catch {
      setShowCode(true);
      setMessage("Copy was blocked. The private code is revealed so you can copy it manually.");
    }
  };

  const finish = (result: CloudSyncResult) => {
    remember(result.state);
    setConflict(false);
    if (result.action === "downloaded") {
      onSettingsChange(result.settings);
      setMessage("Cloud copy downloaded. Reloading the companion…");
      window.setTimeout(() => window.location.reload(), 650);
    } else if (result.action === "uploaded") {
      setMessage("This device is now saved to the encrypted cloud vault.");
    } else {
      setMessage("This device and the cloud copy are already up to date.");
    }
  };

  const run = async (action: Exclude<CloudAction, null>) => {
    if (!linked || busy) return;
    if (action === "upload" && !window.confirm("Replace the cloud copy with the data on this device?")) return;
    if (action === "download" && !window.confirm("Replace portable settings, builds, and history on this device with the cloud copy? PC-only settings will stay unchanged.")) return;
    setBusy(action);
    setMessage(null);
    try {
      const result = action === "upload"
        ? await uploadThisDevice(settings, linkState)
        : action === "download"
          ? await downloadCloudCopy(settings, linkState)
          : await syncCloudCopy(settings, linkState);
      finish(result);
    } catch (error) {
      setConflict(error instanceof CloudSyncConflictError);
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const unlinkDevice = () => {
    if (!window.confirm("Unlink this device? Its local Squadra data will stay here, and the encrypted cloud copy will not be deleted.")) return;
    const cleared = clearCloudLinkState();
    setLinkState(cleared);
    setEndpointDraft(cleared.endpoint);
    setCodeDraft("");
    setConflict(false);
    setShowCode(false);
    setMessage("This device was unlinked. Local data was not changed.");
  };

  return (
    <section className={`cloud-link-panel${linked ? " cloud-link-panel--linked" : ""}`} aria-label="Encrypted cloud link">
      <div className="cloud-link-heading">
        <span className="cloud-link-icon"><Cloud size={18} /></span>
        <div>
          <strong>Encrypted cloud link</strong>
          <small>Move companion data between your PC and Android devices with one private code.</small>
        </div>
        {linked && <span className="cloud-link-ready"><ShieldCheck size={13} /> Linked</span>}
      </div>

      {!linked ? (
        <div className="cloud-link-setup">
          <label>
            <span>Cloud vault URL</span>
            <input
              type="url"
              inputMode="url"
              value={endpointDraft}
              placeholder="https://squadra-cloud.your-name.workers.dev"
              onChange={(event) => setEndpointDraft(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            <span>Private link code</span>
            <div className="cloud-code-entry">
              <KeyRound size={15} />
              <input
                type={showCode ? "text" : "password"}
                value={codeDraft}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                onChange={(event) => setCodeDraft(event.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowCode((shown) => !shown)} aria-label={showCode ? "Hide private link code" : "Show private link code"}>
                {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
          <div className="cloud-link-setup-actions">
            <button type="button" disabled={Boolean(busy)} onClick={generate}><KeyRound size={14} /> {busy === "link" ? "Checking vault…" : "Generate new code"}</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void pair(codeDraft)}><Link2 size={14} /> {busy === "link" ? "Checking vault…" : "Link existing code"}</button>
          </div>
          <small className="cloud-link-help">On the first device, generate a code and upload. On every other device, enter the same URL and code, then download.</small>
        </div>
      ) : (
        <div className="cloud-link-connected">
          <div className="cloud-link-code-row">
            <span>
              <small>Private device code</small>
              <code>{showCode ? formatCloudLinkCode(linkState.linkCode) : "••••-••••-••••-••••-••••-••••"}</code>
            </span>
            <button type="button" onClick={() => setShowCode((shown) => !shown)} aria-label={showCode ? "Hide private link code" : "Show private link code"}>{showCode ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            <button type="button" onClick={() => void copyCode()} aria-label="Copy private link code"><Copy size={15} /></button>
          </div>

          <button className="cloud-sync-primary" type="button" disabled={Boolean(busy)} onClick={() => void run("sync")}>
            <RefreshCw className={busy === "sync" ? "spin" : ""} size={16} />
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>

          <div className={`cloud-resolution-actions${conflict ? " cloud-resolution-actions--needed" : ""}`}>
            <button type="button" disabled={Boolean(busy)} onClick={() => void run("upload")}>
              <CloudUpload size={15} /> {busy === "upload" ? "Uploading…" : "Upload this device"}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void run("download")}>
              <CloudDownload size={15} /> {busy === "download" ? "Downloading…" : "Download cloud copy"}
            </button>
          </div>

          <div className="cloud-link-meta">
            <span>{formattedSyncTime(linkState.lastSyncedAt)}{linkState.revision ? ` • Revision ${linkState.revision}` : ""}</span>
            <button type="button" onClick={unlinkDevice}><Unlink size={13} /> Unlink</button>
          </div>
        </div>
      )}

      {message && <p className={`cloud-link-message${conflict ? " cloud-link-message--warning" : ""}`}>{message}</p>}
      <p className="cloud-link-privacy"><ShieldCheck size={13} /> The link code never enters the cloud database. Your data is encrypted on this {mobileRuntime ? "phone" : "PC"} before upload; anyone with the code can decrypt it, so keep it private.</p>
    </section>
  );
}
