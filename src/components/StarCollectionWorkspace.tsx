import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Coins, Edit3, Heart, LockKeyhole, RotateCcw, Save, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import {
  HERO_UNLOCK_POOLS,
  STAR_COLLECTION_MAX_LEVEL,
  heroUnlockTiersForReward,
  loadStarRewardOverrides,
  rewardForStarLevel,
  saveStarRewardOverrides,
} from "../lib/starCollection";
import type { HeroUnlockTier } from "../lib/starCollection";
import type { RankSnapshot, StarRewardOverrides } from "../types";

interface StarCollectionWorkspaceProps {
  level: number;
  trackerLevel: number | null;
  votes: number | null;
  zeni: number | null;
  playerRank: RankSnapshot | null;
  mobileRuntime?: boolean;
  onLevelChange: (level: number) => void;
  onClose: () => void;
}

type RewardFilter = "all" | "upcoming" | "unlocks";
type StarSection = "overview" | "roadmap" | "unlocks";
const HERO_TIERS: HeroUnlockTier[] = ["IV", "III", "II", "I"];
const FILTER_LABELS: Record<RewardFilter, string> = {
  upcoming: "Upcoming",
  all: "All levels",
  unlocks: "Hero unlocks",
};

export function StarCollectionWorkspace({
  level,
  trackerLevel,
  votes,
  zeni,
  playerRank,
  mobileRuntime = false,
  onLevelChange,
  onClose,
}: StarCollectionWorkspaceProps) {
  const [filter, setFilter] = useState<RewardFilter>("upcoming");
  const [section, setSection] = useState<StarSection>("overview");
  const [poolsExpanded, setPoolsExpanded] = useState(false);
  const [expandedTier, setExpandedTier] = useState<HeroUnlockTier | null>(null);
  const [overrides, setOverrides] = useState<StarRewardOverrides>(() => loadStarRewardOverrides());
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [rewardDraft, setRewardDraft] = useState("");
  const safeLevel = Math.max(1, Math.min(STAR_COLLECTION_MAX_LEVEL, level));

  useEffect(() => saveStarRewardOverrides(overrides), [overrides]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const levels = useMemo(() => Array.from({ length: STAR_COLLECTION_MAX_LEVEL }, (_, index) => index + 1).filter((entry) => {
    if (filter === "upcoming") return entry >= safeLevel;
    if (filter === "unlocks") return heroUnlockTiersForReward(rewardForStarLevel(entry, overrides)).length > 0;
    return true;
  }), [filter, overrides, safeLevel]);
  const progress = (safeLevel - 1) / (STAR_COLLECTION_MAX_LEVEL - 1);
  const nextLevel = safeLevel < STAR_COLLECTION_MAX_LEVEL ? safeLevel + 1 : null;

  const beginEdit = (targetLevel: number) => {
    setEditingLevel(targetLevel);
    setRewardDraft(rewardForStarLevel(targetLevel, overrides) ?? "");
  };
  const saveEdit = () => {
    if (editingLevel === null) return;
    const next = { ...overrides };
    if (rewardDraft.trim()) next[String(editingLevel)] = rewardDraft.trim().slice(0, 120);
    else delete next[String(editingLevel)];
    setOverrides(next);
    setEditingLevel(null);
  };
  const openSection = (nextSection: StarSection) => {
    setSection(nextSection);
    if (nextSection !== "unlocks") {
      setPoolsExpanded(false);
      setExpandedTier(null);
    }
    if (nextSection === "unlocks") setFilter("unlocks");
    else if (nextSection === "roadmap" && filter === "unlocks") setFilter("upcoming");
  };

  return (
    <div className="stars-overlay" role="dialog" aria-modal="true" aria-label="Star Collection roadmap">
      <div className={`stars-workspace stars-view-${section}`}>
        <header className="stars-header">
          <div className="stars-title-lockup"><span><Star /></span><div><small>KazuCorp progression console</small><h1>Star Collection</h1><p>Tracker-synced progress and the complete current Level 1–255 reward roadmap.</p></div></div>
          <button type="button" className="builds-close" onClick={onClose} aria-label="Close Star Collection"><X /></button>
        </header>

        <nav className="stars-mobile-tabs" aria-label="Star Collection sections">
          <button type="button" className={section === "overview" ? "active" : ""} onClick={() => openSection("overview")}><Star />Overview</button>
          <button type="button" className={section === "roadmap" ? "active" : ""} onClick={() => openSection("roadmap")}><Sparkles />Roadmap</button>
          <button type="button" className={section === "unlocks" ? "active" : ""} onClick={() => openSection("unlocks")}><ShieldCheck />Heroes</button>
        </nav>

        <section className="stars-hero">
          <div className="stars-level-orb"><small>Star level</small><strong>{safeLevel}</strong><span>of {STAR_COLLECTION_MAX_LEVEL}</span></div>
          <div className="stars-progress-copy">
            <span>{trackerLevel !== null ? "Tracker-linked level" : "Local fallback level"}</span>
            <h2>{nextLevel ? `Next: Level ${nextLevel} • ${rewardForStarLevel(nextLevel, overrides)}` : "Current Star Collection cap reached"}</h2>
            <div className="stars-progress"><i style={{ width: `${progress * 100}%` }} /></div>
            <p>Sync uses the public tracker’s Star Collection value. Manual correction remains available if community data is temporarily missing or delayed.</p>
          </div>
          <div className="stars-level-controls">
            <label><span>Current level</span><input type="number" min={1} max={STAR_COLLECTION_MAX_LEVEL} value={safeLevel} onChange={(event) => onLevelChange(Math.max(1, Math.min(STAR_COLLECTION_MAX_LEVEL, Number(event.target.value) || 1)))} /></label>
            <div className="stars-cap"><span>Current roadmap cap</span><strong>{STAR_COLLECTION_MAX_LEVEL}</strong><small>Season roster</small></div>
          </div>
        </section>

        <section className="stars-profile-stats">
          <article><Heart /><span><small>Total votes received</small><strong>{votes?.toLocaleString() ?? "Not reported"}</strong></span></article>
          <article><Coins /><span><small>Zeni</small><strong>{zeni?.toLocaleString() ?? "Not reported"}</strong></span></article>
          <article><ShieldCheck /><span><small>Overall player rank</small><strong>{playerRank ? `${playerRank.code} • ${playerRank.score.toLocaleString()} RP` : "Not reported"}</strong></span></article>
        </section>

        <section className="stars-mobile-overview-actions" aria-label="Star Collection shortcuts">
          <button type="button" onClick={() => openSection("roadmap")}>
            <Sparkles /><span><strong>Reward Roadmap</strong><small>Browse every level from 1–255</small></span><b>View all</b>
          </button>
          <button type="button" onClick={() => openSection("unlocks")}>
            <ShieldCheck /><span><strong>Hero Unlocks</strong><small>View all four pools and eligible levels</small></span><b>{HERO_TIERS.reduce((total, tier) => total + HERO_UNLOCK_POOLS[tier].length, 0)} heroes</b>
          </button>
        </section>

        <section className={`stars-pools ${poolsExpanded ? "expanded" : ""}`} aria-label="Hero unlock pools">
          {mobileRuntime ? (
            <button
              type="button"
              className="stars-pools-toggle"
              aria-label={`${poolsExpanded ? "Hide" : "Show"} hero unlock tiers`}
              aria-expanded={poolsExpanded}
              aria-controls="stars-tier-list"
              onClick={() => {
                setPoolsExpanded((current) => !current);
                if (poolsExpanded) setExpandedTier(null);
              }}
            >
              <span><small>Current roster</small><strong>Hero unlock pools</strong></span>
              <b>{HERO_TIERS.reduce((total, tier) => total + HERO_UNLOCK_POOLS[tier].length, 0)} heroes</b>
              <i aria-hidden="true"><ChevronDown /></i>
            </button>
          ) : <div className="stars-pools-heading"><small>Current roster</small><strong>Hero unlock pools</strong></div>}
          <div className="stars-tier-list" id="stars-tier-list">
            {HERO_TIERS.map((tier) => {
              const expanded = expandedTier === tier;
              const panelId = `stars-tier-${tier.toLowerCase()}-fighters`;
              return (
                <article key={tier} className={`stars-tier-card tier-${tier.toLowerCase()} ${expanded ? "expanded" : ""}`}>
                  <button
                    type="button"
                    className="stars-tier-row"
                    aria-label={`${expanded ? "Hide" : "Show"} Tier ${tier} fighters`}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedTier(expanded ? null : tier)}
                  >
                    <span>Tier {tier}</span>
                    <b>{HERO_UNLOCK_POOLS[tier].length} fighters</b>
                    <i aria-hidden="true"><ChevronDown /></i>
                  </button>
                  {expanded && <p id={panelId}>{HERO_UNLOCK_POOLS[tier].join(" • ")}</p>}
                </article>
              );
            })}
          </div>
        </section>

        <div className="stars-filter" role="tablist">
          {(["upcoming", "all", "unlocks"] as RewardFilter[]).map((value) => <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{FILTER_LABELS[value]}</button>)}
        </div>

        <main className="stars-roadmap">
          <div className="stars-roadmap-heading">
            <span><small>{section === "unlocks" ? "Hero eligibility" : "Level rewards"}</small><strong>{section === "unlocks" ? "Unlock milestones" : FILTER_LABELS[filter]}</strong></span>
            <b>{levels.length} levels</b>
          </div>
          {levels.map((starLevel) => {
            const reward = rewardForStarLevel(starLevel, overrides);
            const completed = starLevel <= safeLevel;
            const overridden = Boolean(overrides[String(starLevel)]);
            const unlockTiers = heroUnlockTiersForReward(reward);
            const unlockCopy = unlockTiers.map((tier) => `Tier ${tier} (${HERO_UNLOCK_POOLS[tier].length})`).join(" + ");
            return (
              <article key={starLevel} className={`${completed ? "completed" : ""} ${reward ? "has-reward" : ""}`}>
                <div className="stars-roadmap-level">{completed ? <Check /> : <LockKeyhole />}<span>Level</span><strong>{starLevel}</strong></div>
                <div className="stars-roadmap-reward">
                  <small>{overridden ? "Local correction" : unlockCopy ? `Eligible pool • ${unlockCopy}` : "Current in-game reward"}</small>
                  {editingLevel === starLevel ? (
                    <input autoFocus value={rewardDraft} maxLength={120} placeholder="Enter the reward shown in game" onChange={(event) => setRewardDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveEdit()} />
                  ) : <strong>{reward ?? "Reward unavailable"}</strong>}
                </div>
                <div className="stars-roadmap-actions">
                  {editingLevel === starLevel ? <button type="button" onClick={saveEdit}><Save /> Save</button> : <button type="button" onClick={() => beginEdit(starLevel)}><Edit3 /> {reward ? "Edit" : "Add"}</button>}
                  {overridden && editingLevel !== starLevel && <button type="button" className="reset" onClick={() => { const next = { ...overrides }; delete next[String(starLevel)]; setOverrides(next); }}><RotateCcw /> Reset</button>}
                </div>
              </article>
            );
          })}
        </main>

        <footer className="stars-footer"><Sparkles />Levels 1–255 and all four current Hero Unlock pools were captured from the supplied in-game roadmap. Local corrections remain editable after balance or roster updates.</footer>
      </div>
    </div>
  );
}
