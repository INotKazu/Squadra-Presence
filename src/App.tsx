import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Gamepad2,
  History,
  Layers3,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  WifiOff,
} from "lucide-react";
import { DiscordPreview } from "./components/DiscordPreview";
import { BuildsWorkspace } from "./components/BuildsWorkspace";
import { HistoryWorkspace } from "./components/HistoryWorkspace";
import { MobileNav, MobileProfileCard } from "./components/MobileCompanion";
import type { MobileWorkspace } from "./components/MobileCompanion";
import { RankPicker } from "./components/RankPicker";
import { RankProgress } from "./components/RankProgress";
import { RoleIcon } from "./components/RoleIcon";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { StarCollectionWorkspace } from "./components/StarCollectionWorkspace";
import { StatusPill } from "./components/StatusPill";
import { StartupSplash } from "./components/StartupSplash";
import { UpdateBanner } from "./components/UpdateBanner";
import { CHARACTERS, getCharacter } from "./lib/characters";
import { getHelper, getHelpersForRole } from "./lib/helpers";
import { loadPlayerJournal, recordPlayerJournal } from "./lib/journal";
import {
  clearDiscordPresence,
  checkForUpdate,
  detectGameProcess,
  fetchTrackerProfile,
  getDiscordStatus,
  getLaunchContext,
  installPendingUpdate,
  isTauri,
  setDiscordPresence,
  setLaunchAtLogin,
} from "./lib/bridge";
import { buildPresence, deriveSelection, isSelectableRank } from "./lib/presence";
import { detectRuntimePlatform, isMobilePlatform } from "./lib/platform";
import { loadRankGainHistory, recordRankObservation } from "./lib/progress";
import { rankAssetPath, roleLabel } from "./lib/ranks";
import { STAR_COLLECTION_MAX_LEVEL } from "./lib/starCollection";
import { loadSettings, saveSettings } from "./lib/storage";
import { formatRelativeTime, normalizeTrackerResponse } from "./lib/tracker";
import type { AppSettings, DiscordStatus, PlayerJournal, PlayerProfile, ProcessStatus, RankCode, RoleGainHistory, RoleId, UpdateMetadata } from "./types";

const PROCESS_INTERVAL_MS = 5_000;
const TRACKER_INTERVAL_MS = 120_000;
const TRACKER_BACKOFF_MS = 5 * 60_000;
const TRACKER_MAX_BACKOFF_MS = 30 * 60_000;

function App() {
  const runtimePlatform = useMemo(() => detectRuntimePlatform(), []);
  const mobileRuntime = isMobilePlatform(runtimePlatform);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({ running: false, processName: null });
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus>({ connected: false, lastError: null, updatedAt: null });
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [trackerCooldownUntil, setTrackerCooldownUntil] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(() => isTauri() && !settings.publicId.trim());
  const [buildsOpen, setBuildsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsOpen, setStarsOpen] = useState(false);
  const [startupPhase, setStartupPhase] = useState<"checking" | "visible" | "done">("checking");
  const [availableUpdate, setAvailableUpdate] = useState<UpdateMetadata | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(0);
  const [updateTotal, setUpdateTotal] = useState<number | null>(null);
  const [playerJournal, setPlayerJournal] = useState<PlayerJournal>(() => loadPlayerJournal(settings.publicId));
  const [rankGainHistory, setRankGainHistory] = useState<RoleGainHistory>(() => loadRankGainHistory());
  const [startedAt, setStartedAt] = useState(() => Math.floor(Date.now() / 1000));
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const sentPresenceHash = useRef("");
  const surfacedDiscordError = useRef<string | null>(null);
  const trackerSyncInFlight = useRef(false);
  const trackerCooldownUntilRef = useRef(0);
  const trackerBackoffMs = useRef(TRACKER_BACKOFF_MS);
  const surfacedTrackerError = useRef<string | null>(null);
  const previousGameRunning = useRef<boolean | null>(null);
  const previousAutoPresence = useRef(settings.autoPresenceWithGame);

  const selection = useMemo(() => deriveSelection(settings, profile), [settings, profile]);
  const roleHelpers = useMemo(() => getHelpersForRole(selection.role), [selection.role]);
  const selectedHelper = useMemo(() => getHelper(selection.helperId), [selection.helperId]);
  const shouldBroadcast = !mobileRuntime && settings.presenceEnabled && (!settings.onlyWhileGameRunning || processStatus.running);
  const elapsedSeconds = Math.max(0, now - startedAt);
  const trackerCooldownSeconds = Math.max(0, Math.ceil((trackerCooldownUntil - Date.now()) / 1000));

  const syncTracker = useCallback(async (quiet = false) => {
    if (!settings.publicId.trim() && isTauri()) {
      if (!quiet) setNotice("Add your public player ID in Settings first.");
      return;
    }
    if (trackerSyncInFlight.current) return;
    if (Date.now() < trackerCooldownUntilRef.current) {
      if (!quiet) {
        const minutes = Math.max(1, Math.ceil((trackerCooldownUntilRef.current - Date.now()) / 60_000));
        setNotice(`DBGS Builds asked the app to slow down. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}; your last successful data is still active.`);
      }
      return;
    }

    trackerSyncInFlight.current = true;
    setSyncing(true);
    try {
      const raw = await fetchTrackerProfile(settings.publicId.trim());
      const nextProfile = normalizeTrackerResponse(raw);
      setProfile(nextProfile);
      if (nextProfile.starCollectionLevel) {
        setSettings((current) => current.starCollectionLevel === nextProfile.starCollectionLevel
          ? current
          : {
            ...current,
            starCollectionLevel: nextProfile.starCollectionLevel!,
            starCollectionMaxLevel: STAR_COLLECTION_MAX_LEVEL,
          });
      }
      setRankGainHistory(recordRankObservation(nextProfile));
      setPlayerJournal(recordPlayerJournal(nextProfile, settings.publicId));
      setSyncedAt(Date.now());
      trackerCooldownUntilRef.current = 0;
      trackerBackoffMs.current = TRACKER_BACKOFF_MS;
      surfacedTrackerError.current = null;
      setTrackerCooldownUntil(0);
      if (!quiet) setNotice(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/\b429\b|too many requests|rate.?limit/i.test(message)) {
        const backoff = trackerBackoffMs.current;
        const until = Date.now() + backoff;
        trackerCooldownUntilRef.current = until;
        trackerBackoffMs.current = Math.min(backoff * 2, TRACKER_MAX_BACKOFF_MS);
        setTrackerCooldownUntil(until);
        const minutes = Math.ceil(backoff / 60_000);
        const rateLimitNotice = `DBGS Builds is temporarily rate-limiting requests. Sync paused for ${minutes} minutes; your last successful data is still active.`;
        if (surfacedTrackerError.current !== rateLimitNotice) setNotice(rateLimitNotice);
        surfacedTrackerError.current = rateLimitNotice;
      } else if (!quiet || surfacedTrackerError.current !== message) {
        setNotice(message);
        surfacedTrackerError.current = message;
      }
    } finally {
      trackerSyncInFlight.current = false;
      setSyncing(false);
    }
  }, [settings.publicId]);

  const checkUpdates = useCallback(async (quiet = false) => {
    if (mobileRuntime) {
      if (!quiet) setNotice("Mobile updates are installed through the app store or Android package release.");
      return;
    }
    if (!isTauri()) {
      if (!quiet) setNotice("Update checks are available in the installed desktop app.");
      return;
    }
    setUpdateChecking(true);
    try {
      const update = await checkForUpdate();
      if (update && (!quiet || update.version !== settings.skippedUpdateVersion)) {
        setAvailableUpdate(update);
        if (!quiet) setNotice(null);
      } else if (!quiet) {
        setNotice(update ? `Version ${update.version} is currently skipped. You can install it from the next automatic prompt.` : "Squadra Presence is up to date.");
      }
    } catch (error) {
      if (!quiet) setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdateChecking(false);
    }
  }, [mobileRuntime, settings.skippedUpdateVersion]);

  const installUpdate = async () => {
    setUpdateInstalling(true);
    setUpdateDownloaded(0);
    setUpdateTotal(null);
    try {
      await installPendingUpdate((event) => {
        if (event.event === "started") setUpdateTotal(event.data.contentLength);
        else if (event.event === "progress") setUpdateDownloaded((current) => current + event.data.chunkLength);
      });
    } catch (error) {
      setUpdateInstalling(false);
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.title = mobileRuntime ? "Squadra Companion" : "Squadra Presence";
  }, [mobileRuntime]);

  useEffect(() => {
    let active = true;
    const resolveStartup = async () => {
      const alreadyShown = window.sessionStorage.getItem("squadra-presence.startup-shown") === "1";
      if (!settings.startupAnimation || alreadyShown) {
        if (active) setStartupPhase("done");
        return;
      }
      try {
        const context = await getLaunchContext();
        if (!active) return;
        if (context.background) setStartupPhase("done");
        else {
          window.sessionStorage.setItem("squadra-presence.startup-shown", "1");
          setStartupPhase("visible");
        }
      } catch {
        if (active) setStartupPhase("done");
      }
    };
    void resolveStartup();
    return () => { active = false; };
  }, [settings.startupAnimation]);

  useEffect(() => {
    if (mobileRuntime || startupPhase !== "done" || !settings.autoCheckUpdates) return;
    const timer = window.setTimeout(() => void checkUpdates(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [checkUpdates, mobileRuntime, settings.autoCheckUpdates, startupPhase]);

  useEffect(() => {
    setPlayerJournal(loadPlayerJournal(settings.publicId));
  }, [settings.publicId]);

  useEffect(() => {
    if (mobileRuntime || !isTauri()) return;
    void setLaunchAtLogin(settings.launchAtLogin).catch((error) => {
      setNotice(error instanceof Error ? error.message : String(error));
    });
  }, [mobileRuntime, settings.launchAtLogin]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mobileRuntime) return;
    if (
      settings.presenceEnabled &&
      discordStatus.lastError &&
      discordStatus.lastError !== surfacedDiscordError.current
    ) {
      surfacedDiscordError.current = discordStatus.lastError;
      setNotice(discordStatus.lastError);
    }
    if (!discordStatus.lastError) surfacedDiscordError.current = null;
  }, [discordStatus.lastError, mobileRuntime, settings.presenceEnabled]);

  useEffect(() => {
    void syncTracker(true);
  }, [syncTracker]);

  useEffect(() => {
    if (mobileRuntime) {
      setProcessStatus({ running: false, processName: null });
      return;
    }
    let active = true;
    const check = async () => {
      try {
        const status = await detectGameProcess(settings.processHints);
        if (active) setProcessStatus(status);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : String(error));
      }
    };
    void check();
    const timer = window.setInterval(check, PROCESS_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mobileRuntime, settings.processHints]);

  useEffect(() => {
    if (!settings.autoSync || (!mobileRuntime && !processStatus.running)) return;
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncTracker(true);
    };
    const timer = window.setInterval(() => void syncTracker(true), TRACKER_INTERVAL_MS);
    if (mobileRuntime) document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [mobileRuntime, processStatus.running, settings.autoSync, syncTracker]);

  useEffect(() => {
    if (mobileRuntime) return;
    const previouslyRunning = previousGameRunning.current;
    const autoWasEnabled = previousAutoPresence.current;
    previousGameRunning.current = processStatus.running;
    previousAutoPresence.current = settings.autoPresenceWithGame;

    if (!settings.autoPresenceWithGame) return;
    const gameStateChanged = previouslyRunning !== processStatus.running;
    const autoJustEnabled = !autoWasEnabled;
    if (!gameStateChanged && !autoJustEnabled) return;

    if (processStatus.running) setStartedAt(Math.floor(Date.now() / 1000));
    setSettings((current) => current.presenceEnabled === processStatus.running
      ? current
      : { ...current, presenceEnabled: processStatus.running });
  }, [mobileRuntime, processStatus.running, settings.autoPresenceWithGame]);

  useEffect(() => {
    if (settings.source !== "tracker" || !profile?.latestMatch) return;
    const fighter = getCharacter(profile.latestMatch.characterRankingId, profile.latestMatch.characterName);
    const trackedRank = profile.roleRanks[fighter.defaultRole]?.code;
    setSettings((current) => {
      const manualRank = trackedRank && isSelectableRank(trackedRank) ? trackedRank : current.manualRank;
      if (current.role === fighter.defaultRole && current.manualRank === manualRank) return current;
      return { ...current, role: fighter.defaultRole, manualRank };
    });
  }, [profile, settings.source]);

  useEffect(() => {
    if (settings.source !== "manual") return;
    const fighter = getCharacter(settings.characterRankingId);
    if (settings.role === fighter.defaultRole) return;
    const trackedRank = profile?.roleRanks[fighter.defaultRole]?.code;
    setSettings((current) => ({
      ...current,
      role: fighter.defaultRole,
      manualRank: trackedRank && isSelectableRank(trackedRank) ? trackedRank : current.manualRank,
    }));
  }, [profile, settings.characterRankingId, settings.role, settings.source]);

  useEffect(() => {
    if (mobileRuntime) return;
    const refreshStatus = async () => {
      try {
        setDiscordStatus(await getDiscordStatus());
      } catch {
        // A status refresh should never interrupt the dashboard.
      }
    };
    void refreshStatus();
    const timer = window.setInterval(refreshStatus, 2_000);
    return () => window.clearInterval(timer);
  }, [mobileRuntime]);

  useEffect(() => {
    if (mobileRuntime) return;
    const payload = buildPresence(selection, startedAt);
    const hash = shouldBroadcast ? JSON.stringify(payload) : "";
    if (hash === sentPresenceHash.current) return;

    const timer = window.setTimeout(async () => {
      try {
        if (shouldBroadcast) {
          await setDiscordPresence(payload);
        } else if (sentPresenceHash.current) {
          await clearDiscordPresence();
        }
        sentPresenceHash.current = hash;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : String(error));
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [mobileRuntime, selection, shouldBroadcast, startedAt]);

  const updateSettings = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const togglePresence = () => {
    if (!settings.presenceEnabled) setStartedAt(Math.floor(Date.now() / 1000));
    updateSettings("presenceEnabled", !settings.presenceEnabled);
  };

  const setManualRank = (rank: RankCode) => updateSettings("manualRank", rank);
  const selectManualCharacter = (rankingId: string) => {
    const fighter = getCharacter(rankingId);
    const trackedRank = profile?.roleRanks[fighter.defaultRole]?.code;
    setSettings((current) => ({
      ...current,
      characterRankingId: rankingId,
      role: fighter.defaultRole,
      manualRank: trackedRank && isSelectableRank(trackedRank) ? trackedRank : current.manualRank,
    }));
  };
  const setHelperForCurrentFighter = (helperId: string | null) => {
    setSettings((current) => {
      const helperAssignments = { ...current.helperAssignments };
      if (helperId) helperAssignments[selection.characterId] = helperId;
      else delete helperAssignments[selection.characterId];
      return { ...current, helperAssignments };
    });
  };
  const currentCharacter = getCharacter(selection.characterId);
  const latest = profile?.latestMatch;
  const latestCharacter = latest ? getCharacter(latest.characterRankingId, latest.characterName) : null;
  const currentRoleRank = profile?.roleRanks[selection.role];
  const appModeLabel = !settings.presenceEnabled
    ? "Offline"
    : shouldBroadcast && discordStatus.connected
      ? "Live"
      : shouldBroadcast
        ? "Connecting"
        : "Armed";
  const completeStartup = useCallback(() => setStartupPhase("done"), []);
  const activeMobileWorkspace: MobileWorkspace = settingsOpen
    ? "settings"
    : historyOpen
      ? "history"
      : starsOpen
        ? "stars"
        : buildsOpen
          ? "builds"
          : "dashboard";
  const navigateMobile = (workspace: MobileWorkspace) => {
    setSettingsOpen(workspace === "settings");
    setHistoryOpen(workspace === "history");
    setStarsOpen(workspace === "stars");
    setBuildsOpen(workspace === "builds");
  };

  if (startupPhase === "checking") return <div className="startup-blank" />;
  if (startupPhase === "visible") {
    return <StartupSplash soundEnabled={settings.startupSound} onComplete={completeStartup} />;
  }

  return (
    <div className={`app-shell ${mobileRuntime ? "app-shell--mobile" : ""}`}>
      {!mobileRuntime && <Sidebar selection={selection} profile={profile} rankGainHistory={rankGainHistory} elapsedSeconds={elapsedSeconds} />}

      <main className="app-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{mobileRuntime ? "KazuCorp mobile" : "Companion dashboard"}</span>
            <h1>{mobileRuntime ? "Squadra Companion" : "Battle presence control"}</h1>
          </div>
          {mobileRuntime ? (
            <div className="mobile-topbar-actions">
              <StatusPill
                icon={CloudDownload}
                label={trackerCooldownSeconds ? `Wait ${Math.ceil(trackerCooldownSeconds / 60)}m` : syncedAt ? formatRelativeTime(new Date(syncedAt).toISOString()) : "Not synced"}
                tone={trackerCooldownSeconds ? "warning" : profile ? "online" : "muted"}
              />
              <button className="icon-button" type="button" onClick={() => void syncTracker()} disabled={syncing || trackerCooldownSeconds > 0} aria-label="Sync tracker now">
                <RefreshCw size={18} className={syncing ? "spin" : ""} />
              </button>
            </div>
          ) : <div className="topbar-actions">
            <div className="system-statuses">
              <StatusPill
                icon={Gamepad2}
                label={processStatus.running ? processStatus.processName || "Game detected" : "Game idle"}
                tone={processStatus.running ? "online" : "muted"}
              />
              <StatusPill
                icon={Radio}
                label={`Discord ${appModeLabel}`}
                tone={shouldBroadcast && discordStatus.connected ? "accent" : settings.presenceEnabled ? "warning" : "muted"}
              />
              <StatusPill
                icon={CloudDownload}
                label={trackerCooldownSeconds ? `Tracker wait ${Math.ceil(trackerCooldownSeconds / 60)}m` : syncedAt ? `Synced ${formatRelativeTime(new Date(syncedAt).toISOString())}` : "Not synced"}
                tone={trackerCooldownSeconds ? "warning" : profile ? "online" : "muted"}
              />
            </div>
            <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
              <Settings size={19} />
            </button>
            <button
              className="secondary-button stars-launch-button"
              type="button"
              onClick={() => setStarsOpen(true)}
              title="Open Star Collection and player profile"
            >
              <Star size={16} />
              <span className="stars-launch-copy">
                <strong>Star {settings.starCollectionLevel}</strong>
                <small>{profile?.votes?.toLocaleString() ?? "—"} votes <i /> {profile?.zeni?.toLocaleString() ?? "—"} Zeni</small>
              </span>
            </button>
            <button className="secondary-button history-launch-button" type="button" onClick={() => setHistoryOpen(true)}>
              <History size={16} /> History
            </button>
            <button className="secondary-button build-launch-button" type="button" onClick={() => setBuildsOpen(true)}>
              <Layers3 size={16} /> Builds
            </button>
            <button className="secondary-button" type="button" onClick={() => void syncTracker()} disabled={syncing || trackerCooldownSeconds > 0}>
              <RefreshCw size={16} className={syncing ? "spin" : ""} />
              {syncing ? "Syncing" : trackerCooldownSeconds ? `Retry in ${Math.ceil(trackerCooldownSeconds / 60)}m` : "Sync now"}
            </button>
            <button className={`broadcast-button ${settings.presenceEnabled ? "broadcast-button--on" : ""}`} type="button" onClick={togglePresence}>
              <span /> {settings.presenceEnabled ? "Stop presence" : "Start presence"}
            </button>
          </div>}
        </header>

        {!mobileRuntime && availableUpdate && (
          <UpdateBanner
            update={availableUpdate}
            installing={updateInstalling}
            downloaded={updateDownloaded}
            total={updateTotal}
            onInstall={() => void installUpdate()}
            onLater={() => setAvailableUpdate(null)}
            onSkip={() => {
              setSettings((current) => ({ ...current, skippedUpdateVersion: availableUpdate.version }));
              setAvailableUpdate(null);
            }}
          />
        )}

        <div className="dashboard-grid">
          <section className="battle-summary shell-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Active loadout</span>
                <h2>{selection.characterName}</h2>
              </div>
              <span className={`source-chip source-chip--${settings.source}`}>
                {settings.source === "tracker" ? "Tracker linked" : "Manual control"}
              </span>
            </div>

            <div className="selection-showcase">
              <div className="selection-portrait">
                {selection.portrait ? (
                  <img src={selection.portrait} alt="" />
                ) : (
                  <img className="selection-fallback" src="/assets/app-icon.png" alt="" />
                )}
              </div>
              <div className="selection-data">
                <span className="eyebrow">Fighter</span>
                <h3>{currentCharacter.name}</h3>
                <p>{mobileRuntime ? "Your selected fighter, rank, and helper stay with this device and can move by backup." : selection.largeImageKey ? "Discord character asset ready" : "Using the application icon until this fighter asset is uploaded"}</p>
                <div className="selection-badges">
                  <span><RoleIcon role={selection.role} /> {roleLabel(selection.role)}</span>
                  <span>{rankAssetPath(selection.rank) && <img src={rankAssetPath(selection.rank)} alt="" />} {selection.rank}</span>
                  {selection.helperName && (
                    <span className="helper-badge">
                      {selection.helperPortrait ? <img src={selection.helperPortrait} alt="" /> : null}
                      Helper {selection.helperName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="readiness-list">
              <div className={selection.largeImageKey ? "ready" : "pending"}>
                {selection.largeImageKey ? <CheckCircle2 /> : <AlertTriangle />}
                <span><strong>Character</strong><small>{selection.largeImageKey || mobileRuntime ? currentCharacter.name : `${currentCharacter.name} • artwork pending`}</small></span>
              </div>
              <div className="ready">
                <ShieldCheck />
                <span><strong>Rank</strong><small>{selection.rank}</small></span>
              </div>
              <div className={selection.helperName ? "ready" : "optional"}>
                <Sparkles />
                <span><strong>Role helper</strong><small>{selection.helperName ?? "None selected"}</small></span>
              </div>
            </div>
          </section>

          {mobileRuntime ? (
            <MobileProfileCard
              profile={profile}
              settings={settings}
              journal={playerJournal}
              onOpenHistory={() => navigateMobile("history")}
              onOpenStars={() => navigateMobile("stars")}
            />
          ) : (
            <DiscordPreview
              selection={selection}
              nickname={profile?.nickname ?? "Player"}
              elapsedSeconds={elapsedSeconds}
              live={shouldBroadcast && discordStatus.connected}
            />
          )}

          <section className="control-deck shell-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">Squadra control deck</span>
                <h2>{mobileRuntime ? "Fighter workspace" : "Presence mapping"}</h2>
              </div>
              <div className="segmented-control">
                <button
                  type="button"
                  className={settings.source === "manual" ? "active" : ""}
                  onClick={() => updateSettings("source", "manual")}
                >Manual</button>
                <button
                  type="button"
                  className={settings.source === "tracker" ? "active" : ""}
                  onClick={() => updateSettings("source", "tracker")}
                >Latest match</button>
              </div>
            </div>

            <div className="control-grid">
              <div className="control-block role-control">
                <span className="control-label">Role rank source</span>
                <div className="role-buttons">
                  {(["damage", "tank", "technical"] as RoleId[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={selection.role === role ? "selected" : ""}
                      disabled
                      title={selection.role === role ? `Automatically tied to ${selection.characterName}` : "Choose a fighter assigned to this role"}
                    >
                      <RoleIcon role={role} size="large" />
                      <span>{roleLabel(role)}</span>
                      <strong>{profile?.roleRanks[role].code ?? (role === settings.role ? settings.manualRank : "—")}</strong>
                      {profile?.roleRanks[role] && <RankProgress role={role} snapshot={profile.roleRanks[role]} history={rankGainHistory} compact />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-block character-control">
                <span className="control-label">Manual fighter</span>
                <div className="character-buttons">
                  {CHARACTERS.map((character) => (
                    <button
                      key={character.rankingId}
                      type="button"
                      className={settings.characterRankingId === character.rankingId ? "selected" : ""}
                      onClick={() => selectManualCharacter(character.rankingId)}
                      disabled={settings.source === "tracker"}
                      title={character.label}
                    >
                      {character.portrait ? <img src={character.portrait} alt="" /> : <span>{character.name.charAt(0)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="helper-control">
              <div className="helper-title-row">
                <span className="control-label">Helper for {selection.characterName}</span>
                <small>Remembered separately for each fighter</small>
              </div>
              <div className="helper-buttons">
                <button
                  type="button"
                  className={!selection.helperId ? "selected" : ""}
                  onClick={() => setHelperForCurrentFighter(null)}
                  title="No helper"
                >
                  <span>—</span><small>None</small>
                </button>
                {roleHelpers.map((helper) => (
                  <button
                    key={helper.id}
                    type="button"
                    className={selection.helperId === helper.id ? "selected" : ""}
                    onClick={() => setHelperForCurrentFighter(helper.id)}
                    title={`${helper.label}: ${helper.effect}`}
                  >
                    {helper.portrait ? <img src={helper.portrait} alt="" /> : <span>{helper.name.charAt(0)}</span>}
                    <small>{helper.label}</small>
                  </button>
                ))}
              </div>
              <div className="helper-effect">
                <strong>{selectedHelper ? selectedHelper.label : `${roleLabel(selection.role)} helpers`}</strong>
                <span>{selectedHelper?.effect ?? `Choose one of the helpers available to ${roleLabel(selection.role)} fighters.`}</span>
              </div>
            </div>

            <div className="rank-control">
              <div className="rank-title-row">
                <span className="control-label">Manual rank ladder</span>
                <small>{settings.source === "tracker" ? `Locked to ${roleLabel(selection.role)} score: ${currentRoleRank?.score ?? 0}` : "Choose the exact in-game division"}</small>
              </div>
              <RankPicker value={settings.manualRank} onChange={setManualRank} disabled={settings.source === "tracker"} />
            </div>
          </section>

          <section className="tracker-card shell-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">Community tracker</span>
                <h2>Latest completed match</h2>
              </div>
              {latest ? <span className={`result-chip result-chip--${latest.outcome.toLowerCase()}`}>{latest.outcome}</span> : <WifiOff size={18} />}
            </div>

            {latest ? (
              <>
                <div className="tracker-match">
                  <div className="tracker-character">
                    {latestCharacter?.portrait ? <img src={latestCharacter.portrait} alt="" /> : <span>{latest.characterName.charAt(0)}</span>}
                    <div><strong>{latest.characterName}</strong><small>{latest.gameType} {latest.teamFormat}</small></div>
                  </div>
                  <div className="tracker-stats">
                    <div><span>KOs</span><strong>{latest.knockouts ?? "—"}</strong></div>
                    <div><span>Assists</span><strong>{latest.assists ?? "—"}</strong></div>
                    <div><span>Damage</span><strong>{latest.damage?.toLocaleString() ?? "—"}</strong></div>
                    <div><span>Level</span><strong>{latest.level ?? "—"}</strong></div>
                  </div>
                </div>
                <div className="tracker-foot">
                  <Activity size={14} /> Completed {formatRelativeTime(latest.playedAt)}
                  <i /> {latest.loadoutIds.length ? `${latest.loadoutIds.length} loadout IDs captured` : "Build data pending"}
                </div>
              </>
            ) : (
              <div className="empty-state"><Swords /><strong>No tracker match loaded</strong><span>Use Sync now to load the latest completed match.</span></div>
            )}
          </section>
        </div>

        <footer className="main-footer">
          <span>Tracker: DBGS Builds community data</span>
          <i />
          {!mobileRuntime && <><span>Discord App 1541227940354859099</span><i /></>}
          <span>{mobileRuntime ? `${runtimePlatform === "android" ? "Android" : "iOS"} companion • Local data` : isTauri() ? "Desktop runtime" : "Browser preview mode"}</span>
        </footer>
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          mobileRuntime={mobileRuntime}
          onChange={setSettings}
          onSelectCharacter={selectManualCharacter}
          onCheckUpdates={() => checkUpdates(false)}
          updateChecking={updateChecking}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {historyOpen && (
        <HistoryWorkspace
          journal={playerJournal}
          nickname={profile?.nickname ?? "Player"}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {starsOpen && (
        <StarCollectionWorkspace
          level={settings.starCollectionLevel}
          trackerLevel={profile?.starCollectionLevel ?? null}
          votes={profile?.votes ?? null}
          zeni={profile?.zeni ?? null}
          playerRank={profile?.playerRank ?? null}
          onLevelChange={(level) => setSettings((current) => ({ ...current, starCollectionLevel: level, starCollectionMaxLevel: STAR_COLLECTION_MAX_LEVEL }))}
          onClose={() => setStarsOpen(false)}
        />
      )}
      {buildsOpen && <BuildsWorkspace initialCharacterId={selection.characterId} onClose={() => setBuildsOpen(false)} />}
      {mobileRuntime && <MobileNav active={activeMobileWorkspace} onNavigate={navigateMobile} />}
      {notice && (
        <button className="notice-toast" type="button" onClick={() => setNotice(null)}>
          <AlertTriangle size={17} />
          <span>{notice}</span>
          <small>Dismiss</small>
        </button>
      )}
    </div>
  );
}

export default App;
