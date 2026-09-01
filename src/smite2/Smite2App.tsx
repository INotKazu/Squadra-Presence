import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Gamepad2,
  Hammer,
  LayoutDashboard,
  Menu,
  Monitor,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import { detectRuntimePlatform, isMobilePlatform } from "../lib/platform";
import {
  smiteBrainBuildsUrl,
  smiteSourceGodsUrl,
  smiteSourceTrackerUrl,
} from "./sources";
import {
  DEFAULT_SMITE2_SETTINGS,
  loadSmite2Journal,
  loadSmite2SavedBuilds,
  loadSmite2Settings,
  saveSmite2Settings,
  type Smite2Settings,
} from "./storage";

export type Smite2Workspace = "overview" | "builds" | "journal" | "gods" | "cloud" | "settings";

interface NavItem {
  id: Smite2Workspace;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "builds", label: "Builds", icon: Hammer },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "gods", label: "Gods", icon: Users },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = NAV_ITEMS.filter(({ id }) => id !== "cloud");

function titleCase(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function SourceButton({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <a className="s2-source-button" href={href} target="_blank" rel="noreferrer">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <ExternalLink size={18} />
    </a>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: ComponentType<{ size?: number }>; title: string; detail: string }) {
  return (
    <div className="s2-empty-state">
      <span><Icon size={26} /></span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

function Toggle({ checked, label, detail, onChange }: {
  checked: boolean;
  label: string;
  detail: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="s2-toggle-row">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function OverviewWorkspace({ settings, onNavigate }: {
  settings: Smite2Settings;
  onNavigate: (workspace: Smite2Workspace) => void;
}) {
  const builds = loadSmite2SavedBuilds();
  const journal = loadSmite2Journal();
  const wins = journal.matches.filter((match) => match.outcome === "win").length;

  return (
    <div className="s2-workspace-grid">
      <section className="s2-panel s2-hero-panel">
        <div className="s2-panel-heading">
          <div><span className="s2-eyebrow">Divine link</span><h2>Your battle companion</h2></div>
          <span className="s2-live-chip"><i /> Framework online</span>
        </div>
        <div className="s2-hero-copy">
          <div className="s2-god-orbit"><Sparkles size={30} /><span /></div>
          <div>
            <small>Currently selected</small>
            <h3>{settings.selectedGodSlug ? titleCase(settings.selectedGodSlug) : "Choose your first god"}</h3>
            <p>{titleCase(settings.defaultRole)} • {titleCase(settings.defaultMode)} • {titleCase(settings.platform)}</p>
          </div>
        </div>
        <div className="s2-quick-actions">
          <button type="button" onClick={() => onNavigate("gods")}><Users size={18} /> Browse gods</button>
          <button type="button" onClick={() => onNavigate("builds")}><Hammer size={18} /> Find a build</button>
        </div>
      </section>

      <section className="s2-stat-grid" aria-label="Companion summary">
        <button type="button" onClick={() => onNavigate("builds")}>
          <Hammer /><span>Saved builds<strong>{builds.length}</strong></span>
        </button>
        <button type="button" onClick={() => onNavigate("journal")}>
          <BookOpen /><span>Recorded matches<strong>{journal.matches.length}</strong></span>
        </button>
        <button type="button" onClick={() => onNavigate("journal")}>
          <Swords /><span>Recorded wins<strong>{wins}</strong></span>
        </button>
      </section>

      <section className="s2-panel s2-source-network">
        <div className="s2-panel-heading">
          <div><span className="s2-eyebrow">Approved network</span><h2>Builds and player data</h2></div>
          <ShieldCheck size={22} />
        </div>
        <SourceButton href={smiteBrainBuildsUrl()} label="SmiteBrain" detail="Ranked builds and recommendations" />
        <SourceButton href={smiteSourceTrackerUrl()} label="SmiteSource" detail="Tracker, matches, gods and items" />
        <p className="s2-source-note">Only these two sources can enter the companion. Community data from other providers is blocked.</p>
      </section>

      <section className="s2-panel s2-readiness">
        <div className="s2-panel-heading"><div><span className="s2-eyebrow">Conversion status</span><h2>Companion readiness</h2></div></div>
        <div><span><Monitor /></span><p><strong>PC shell</strong><small>KazuCorp desktop framework</small></p><CheckCircle2 /></div>
        <div><span><Smartphone /></span><p><strong>Android shell</strong><small>Responsive companion layout</small></p><CheckCircle2 /></div>
        <div><span><ShieldCheck /></span><p><strong>Private cloud boundary</strong><small>Separate encrypted namespace</small></p><CheckCircle2 /></div>
        <div className="pending"><span><Radio /></span><p><strong>Discord and OBS</strong><small>Next protected layer</small></p><i>Next</i></div>
      </section>
    </div>
  );
}

function BuildsWorkspace() {
  const builds = loadSmite2SavedBuilds();
  return (
    <section className="s2-panel s2-full-panel">
      <div className="s2-panel-heading">
        <div><span className="s2-eyebrow">Build workshop</span><h2>Saved and recommended builds</h2></div>
        <span className="s2-count-chip">{builds.length} saved</span>
      </div>
      <div className="s2-source-pair">
        <SourceButton href={smiteBrainBuildsUrl()} label="Open SmiteBrain builds" detail="Top-ranked player recommendations" />
        <SourceButton href={smiteSourceGodsUrl()} label="Open SmiteSource gods" detail="God pages and community builds" />
      </div>
      {builds.length === 0 ? (
        <EmptyState icon={Hammer} title="Your workshop is ready" detail="Save a SmiteBrain or SmiteSource build and it will appear here on PC and Android." />
      ) : (
        <div className="s2-card-list">
          {builds.map((build) => <article key={build.id}><strong>{build.title}</strong><span>{titleCase(build.godSlug)}</span><small>{build.source}</small></article>)}
        </div>
      )}
    </section>
  );
}

function JournalWorkspace() {
  const journal = loadSmite2Journal();
  return (
    <section className="s2-panel s2-full-panel">
      <div className="s2-panel-heading">
        <div><span className="s2-eyebrow">Battle journal</span><h2>Match history</h2></div>
        <span className="s2-count-chip">{journal.matches.length} matches</span>
      </div>
      {journal.matches.length === 0 ? (
        <EmptyState icon={BookOpen} title="No matches recorded yet" detail="Once tracker sync is connected, your SMITE 2 matches and rank movement will live here without touching Squadra history." />
      ) : (
        <div className="s2-card-list">
          {journal.matches.map((match) => <article key={match.matchId}><strong>{titleCase(match.godSlug)}</strong><span>{titleCase(match.outcome)}</span><small>{new Date(match.playedAt).toLocaleDateString()}</small></article>)}
        </div>
      )}
    </section>
  );
}

function GodsWorkspace({ settings, updateSettings }: {
  settings: Smite2Settings;
  updateSettings: (patch: Partial<Smite2Settings>) => void;
}) {
  const [godName, setGodName] = useState(settings.selectedGodSlug ? titleCase(settings.selectedGodSlug) : "");
  const selectGod = () => updateSettings({ selectedGodSlug: godName });
  return (
    <section className="s2-panel s2-full-panel">
      <div className="s2-panel-heading"><div><span className="s2-eyebrow">God archive</span><h2>Select your god</h2></div><Users /></div>
      <div className="s2-search-row">
        <Search size={20} />
        <input value={godName} onChange={(event) => setGodName(event.target.value)} placeholder="Enter a SMITE 2 god name" />
        <button type="button" onClick={selectGod}>Select</button>
      </div>
      <EmptyState icon={Database} title="Live god catalog comes next" detail="The shell is ready for the attributed SmiteBrain catalog and cached offline fallback. No unapproved roster data is bundled." />
      <SourceButton href={smiteSourceGodsUrl()} label="Browse SmiteSource gods" detail="Open the approved public god directory" />
    </section>
  );
}

function CloudWorkspace() {
  return (
    <section className="s2-panel s2-full-panel">
      <div className="s2-panel-heading"><div><span className="s2-eyebrow">Private vault</span><h2>Cross-device cloud link</h2></div><ShieldCheck /></div>
      <div className="s2-vault-visual"><Cloud size={38} /><span><i /><i /><i /></span><Smartphone size={30} /></div>
      <div className="s2-vault-status">
        <CheckCircle2 />
        <p><strong>SMITE 2 encryption boundary ready</strong><small>Vault identity, authorization, payload format, and encryption keys are isolated from Squadra.</small></p>
      </div>
      <EmptyState icon={Cloud} title="Device linking is not enabled yet" detail="The next cloud transport step will connect PC and Android through the existing encrypted Worker without sharing Squadra vaults." />
    </section>
  );
}

function SettingsWorkspace({ settings, updateSettings }: {
  settings: Smite2Settings;
  updateSettings: (patch: Partial<Smite2Settings>) => void;
}) {
  return (
    <section className="s2-panel s2-full-panel">
      <div className="s2-panel-heading"><div><span className="s2-eyebrow">Companion setup</span><h2>Settings</h2></div><Settings /></div>
      <div className="s2-form-grid">
        <label><span>Player name</span><input value={settings.playerName} onChange={(event) => updateSettings({ playerName: event.target.value })} placeholder="Your SMITE 2 name" /></label>
        <label><span>Platform</span><select value={settings.platform} onChange={(event) => updateSettings({ platform: event.target.value as Smite2Settings["platform"] })}><option value="steam">Steam</option><option value="epic">Epic</option><option value="xbox">Xbox</option><option value="playstation">PlayStation</option><option value="switch">Switch</option></select></label>
        <label><span>Default role</span><select value={settings.defaultRole} onChange={(event) => updateSettings({ defaultRole: event.target.value as Smite2Settings["defaultRole"] })}><option value="carry">Carry</option><option value="support">Support</option><option value="mid">Mid</option><option value="jungle">Jungle</option><option value="solo">Solo</option></select></label>
        <label><span>Default mode</span><select value={settings.defaultMode} onChange={(event) => updateSettings({ defaultMode: event.target.value as Smite2Settings["defaultMode"] })}><option value="conquest">Conquest</option><option value="arena">Arena</option><option value="assault">Assault</option><option value="joust">Joust</option><option value="duel">Duel</option><option value="other">Other</option></select></label>
      </div>
      <div className="s2-toggle-stack">
        <Toggle checked={settings.autoSync} label="Automatic sync" detail="Refresh approved tracker data when available." onChange={(autoSync) => updateSettings({ autoSync })} />
        <Toggle checked={settings.presenceEnabled} label="Discord presence" detail="Desktop only; wiring arrives in the next layer." onChange={(presenceEnabled) => updateSettings({ presenceEnabled })} />
        <Toggle checked={settings.overlayEnabled} label="OBS overlay" detail="Keep the local desktop overlay enabled." onChange={(overlayEnabled) => updateSettings({ overlayEnabled })} />
        <Toggle checked={settings.startupAnimation} label="KazuCorp startup" detail="Show the charged wolf intro when the app opens." onChange={(startupAnimation) => updateSettings({ startupAnimation })} />
      </div>
    </section>
  );
}

function Workspace({ active, settings, updateSettings, onNavigate }: {
  active: Smite2Workspace;
  settings: Smite2Settings;
  updateSettings: (patch: Partial<Smite2Settings>) => void;
  onNavigate: (workspace: Smite2Workspace) => void;
}) {
  if (active === "builds") return <BuildsWorkspace />;
  if (active === "journal") return <JournalWorkspace />;
  if (active === "gods") return <GodsWorkspace settings={settings} updateSettings={updateSettings} />;
  if (active === "cloud") return <CloudWorkspace />;
  if (active === "settings") return <SettingsWorkspace settings={settings} updateSettings={updateSettings} />;
  return <OverviewWorkspace settings={settings} onNavigate={onNavigate} />;
}

export function Smite2Dashboard() {
  const runtime = useMemo(() => detectRuntimePlatform(), []);
  const mobile = isMobilePlatform(runtime);
  const [active, setActive] = useState<Smite2Workspace>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Smite2Settings>(() => loadSmite2Settings());
  const updateSettings = (patch: Partial<Smite2Settings>) => setSettings((current) => ({ ...current, ...patch }));

  useEffect(() => { saveSmite2Settings(settings); }, [settings]);
  useEffect(() => { document.title = mobile ? "SMITE 2 Companion" : "KazuCorp SMITE 2 Companion"; }, [mobile]);

  const navigate = (workspace: Smite2Workspace) => {
    setActive(workspace);
    setMenuOpen(false);
  };

  return (
    <div className="s2-app">
      <aside className={`s2-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="s2-brand">
          <img src="/assets/kazucorp-logo.png" alt="" />
          <span><small>KazuCorp</small><strong>SMITE 2</strong><em>Companion</em></span>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav aria-label="Primary navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={active === id ? "active" : ""} onClick={() => navigate(id)}>
              <Icon size={20} /><span>{label}</span>{active === id && <i />}
            </button>
          ))}
        </nav>
        <div className="s2-sidebar-card">
          <ShieldCheck />
          <span><strong>Approved sources</strong><small>SmiteBrain + SmiteSource</small></span>
        </div>
        <footer>Made by Kazuma<br /><span>Discord: kazumavt • KazuCorp</span></footer>
      </aside>
      {menuOpen && <button className="s2-menu-scrim" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}

      <main>
        <header className="s2-topbar">
          <button className="s2-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <div><span className="s2-eyebrow">KazuCorp divine systems</span><h1>{NAV_ITEMS.find(({ id }) => id === active)?.label}</h1></div>
          <div className="s2-runtime"><span><Gamepad2 size={17} /> {titleCase(runtime)}</span><i /><strong>Local data</strong></div>
        </header>
        <div className="s2-content">
          <Workspace active={active} settings={settings} updateSettings={updateSettings} onNavigate={navigate} />
        </div>
      </main>

      <nav className="s2-mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={active === id ? "active" : ""} onClick={() => navigate(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Smite2Startup({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1_900);
    return () => window.clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className="s2-startup" role="status">
      <div className="s2-startup-grid" />
      <div className="s2-startup-logo"><span /><img src="/assets/kazucorp-logo.png" alt="KazuCorp wolf emblem" /></div>
      <small>KazuCorp Systems</small>
      <h1>SMITE 2 COMPANION</h1>
      <p><i /> Divine link initialized</p>
    </div>
  );
}

export default function Smite2App() {
  const initialSettings = useMemo(() => loadSmite2Settings(), []);
  const [startup, setStartup] = useState(initialSettings.startupAnimation);
  return startup ? <Smite2Startup onComplete={() => setStartup(false)} /> : <Smite2Dashboard />;
}

export { DEFAULT_SMITE2_SETTINGS };
