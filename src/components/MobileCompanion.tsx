import { Coins, Heart, History, Home, Layers3, Settings, Star } from "lucide-react";
import { roleLabel } from "../lib/ranks";
import type { AppSettings, PlayerJournal, PlayerProfile, RoleId } from "../types";
import { RoleIcon } from "./RoleIcon";

export type MobileWorkspace = "dashboard" | "history" | "stars" | "builds" | "settings";

interface MobileNavProps {
  active: MobileWorkspace;
  onNavigate: (workspace: MobileWorkspace) => void;
}

const MOBILE_NAV_ITEMS = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "history", label: "Journal", icon: History },
  { id: "stars", label: "Stars", icon: Star },
  { id: "builds", label: "Builds", icon: Layers3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav({ active, onNavigate }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Companion navigation">
      {MOBILE_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={active === id ? "active" : ""}
          onClick={() => onNavigate(id)}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

interface MobileProfileCardProps {
  profile: PlayerProfile | null;
  settings: AppSettings;
  journal: PlayerJournal;
  onOpenHistory: () => void;
  onOpenStars: () => void;
}

export function MobileProfileCard({ profile, settings, journal, onOpenHistory, onOpenStars }: MobileProfileCardProps) {
  return (
    <section className="mobile-profile-card shell-panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Player snapshot</span>
          <h2>{profile?.nickname ?? "Your Squadra profile"}</h2>
        </div>
        <span className="source-chip source-chip--tracker">Phone companion</span>
      </div>

      <div className="mobile-profile-stats">
        <button type="button" onClick={onOpenStars}>
          <Star />
          <span>Star level<strong>{settings.starCollectionLevel}</strong></span>
        </button>
        <button type="button" onClick={onOpenHistory}>
          <span className="mobile-stat-icon"><History /></span>
          <span>Saved matches<strong>{journal.matches.length}</strong></span>
        </button>
        <button type="button" onClick={onOpenStars}>
          <Heart />
          <span>Total votes<strong>{profile?.votes?.toLocaleString() ?? "—"}</strong></span>
        </button>
        <button type="button" onClick={onOpenStars}>
          <Coins />
          <span>Zeni<strong>{profile?.zeni?.toLocaleString() ?? "—"}</strong></span>
        </button>
      </div>

      <div className="mobile-rank-strip">
        {(["damage", "tank", "technical"] as RoleId[]).map((role) => (
          <div key={role}>
            <RoleIcon role={role} />
            <span>{roleLabel(role)}<strong>{profile?.roleRanks[role].code ?? "—"}</strong></span>
          </div>
        ))}
      </div>

      <button className="mobile-journal-link" type="button" onClick={onOpenHistory}>
        Open full season journal <History />
      </button>
    </section>
  );
}
