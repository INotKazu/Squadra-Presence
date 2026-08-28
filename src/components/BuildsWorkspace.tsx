import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CopyPlus,
  Crown,
  Edit3,
  Layers3,
  MessageCircleMore,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  Sparkles,
  Star,
  Swords,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { fetchBuildGuide, fetchHeroAbilities } from "../lib/bridge";
import { createBuildId, cacheAbilities, loadCachedAbilities, loadSavedBuilds, saveSavedBuilds } from "../lib/buildLibrary";
import { decodeBuildShare, encodeBuildShare } from "../lib/buildShare";
import { getCard, getCardsForSlot } from "../lib/cards";
import { CHARACTERS, getCharacter } from "../lib/characters";
import { getHelper, getHelpersForRole } from "../lib/helpers";
import { cacheBuildGuide, loadCachedBuildGuide, parseBuildGuideHtml } from "../lib/guide";
import { getKazumaPicks, loadKazumaPickOverrides, saveKazumaPickOverrides } from "../lib/kazumaPicks";
import { getCharacterByHeroId, getHeroReferenceId, getRecommendedBuild } from "../lib/reference";
import { roleLabel } from "../lib/ranks";
import type { AbilityReference, CardDefinition, CuratedBuild, ExpandedBuildGuide, SavedBuild } from "../types";
import { RoleIcon } from "./RoleIcon";

interface BuildsWorkspaceProps {
  initialCharacterId: string;
  onClose: () => void;
}

type WorkspaceTab = "builds" | "abilities";
type ShareMode = "share" | "import" | null;

function CardTile({ card, selected = false, compact = false, onClick }: {
  card: CardDefinition;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <img src={card.portrait} alt="" />
      <span>{card.name}</span>
      {selected && <Check className="card-selected-check" size={15} />}
      <div className="card-effect-tooltip" role="tooltip">
        <strong>{card.name}</strong>
        <small>Card {card.slot} • {card.family}</small>
        <p>{card.effect}</p>
      </div>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className={`build-card-tile build-card-tile--${card.family} ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
      onClick={onClick}
      aria-label={`${selected ? "Selected" : "Select"} ${card.name}: ${card.effect}`}
    >
      {content}
    </button>
  ) : (
    <div className={`build-card-tile build-card-tile--${card.family} ${compact ? "compact" : ""}`} tabIndex={0}>
      {content}
    </div>
  );
}

function BuildCards({ cardIds, compact = false }: { cardIds: string[]; compact?: boolean }) {
  return (
    <div className={`build-card-row ${compact ? "compact" : ""}`}>
      {cardIds.map((cardId) => {
        const card = getCard(cardId);
        return card ? <CardTile key={card.id} card={card} compact={compact} /> : null;
      })}
    </div>
  );
}

function abilityIcon(slot: string) {
  if (/passive/i.test(slot)) return Sparkles;
  if (/rush/i.test(slot)) return Swords;
  if (/super/i.test(slot)) return Star;
  if (/transform/i.test(slot)) return RefreshCw;
  return Zap;
}

function GuideFighters({ heroIds, emptyLabel }: { heroIds: string[]; emptyLabel: string }) {
  const fighters = heroIds.map(getCharacterByHeroId).filter(Boolean);
  if (!fighters.length) return <span className="guide-empty-inline">{emptyLabel}</span>;
  return (
    <div className="guide-fighter-strip">
      {fighters.map((fighter) => fighter && (
        <div key={fighter.rankingId} title={fighter.name}>
          {fighter.portrait ? <img src={fighter.portrait} alt="" /> : <span>{fighter.name.charAt(0)}</span>}
          <small>{fighter.name}</small>
        </div>
      ))}
    </div>
  );
}

function ExpandedGuidePanel({ guide }: { guide: ExpandedBuildGuide }) {
  return (
    <section className="expanded-guide build-surface">
      <div className="build-section-heading">
        <div><span className="eyebrow">Live reference • cached 7 days</span><h3>Strategy and situational guide</h3></div>
      </div>
      <div className="expanded-guide-grid">
        <article className="guide-explanation">
          <span>Build explanation</span>
          <p>{guide.explanation ?? "No expanded explanation is currently published for this fighter."}</p>
        </article>
        <article className="guide-situational">
          <span>Situational cards</span>
          {guide.situationalCards.length ? guide.situationalCards.map((choice) => {
            const card = getCard(choice.id);
            return card ? <div className="guide-choice" key={choice.id}><CardTile card={card} compact /><p>{choice.note ?? card.effect}</p></div> : null;
          }) : <p className="guide-empty-inline">No alternate card is listed.</p>}
        </article>
        <article className="guide-situational">
          <span>Situational Helpers</span>
          {guide.situationalHelpers.length ? guide.situationalHelpers.map((choice) => {
            const helper = getHelper(choice.id);
            return helper ? <div className="guide-helper-choice" key={choice.id}>{helper.portrait && <img src={helper.portrait} alt="" />}<div><strong>{helper.name}</strong><p>{choice.note ?? helper.effect}</p></div></div> : null;
          }) : <p className="guide-empty-inline">No alternate Helper is listed.</p>}
        </article>
        <article className="guide-skill-order">
          <span>Skill upgrade order</span>
          {guide.skillOrder.length ? guide.skillOrder.map((row) => <div key={row.skill}><strong>{row.skill}</strong><p>{row.levels.map((level) => <i key={level}>{level}</i>)}</p></div>) : <p className="guide-empty-inline">No upgrade order is listed.</p>}
        </article>
        <article className="guide-matchups">
          <span>Recommended teammates</span>
          <GuideFighters heroIds={guide.recommendedCompHeroIds} emptyLabel="No team recommendation is listed." />
        </article>
        <article className="guide-matchups guide-matchups--strong">
          <span>Strong against</span>
          <GuideFighters heroIds={guide.strongAgainstHeroIds} emptyLabel="No favorable matchup is listed." />
        </article>
        <article className="guide-matchups guide-matchups--weak">
          <span>Watch out for</span>
          <GuideFighters heroIds={guide.weakAgainstHeroIds} emptyLabel="No difficult matchup is listed." />
        </article>
      </div>
    </section>
  );
}

export function BuildsWorkspace({ initialCharacterId, onClose }: BuildsWorkspaceProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialCharacterId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("builds");
  const [search, setSearch] = useState("");
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>(() => loadSavedBuilds());
  const [kazumaOverrides, setKazumaOverrides] = useState<Record<string, CuratedBuild>>(() => loadKazumaPickOverrides());
  const [draft, setDraft] = useState<SavedBuild | null>(null);
  const [curatedDraft, setCuratedDraft] = useState<CuratedBuild | null>(null);
  const [abilities, setAbilities] = useState<AbilityReference[]>([]);
  const [abilityHeroId, setAbilityHeroId] = useState<string | null>(null);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [abilitiesError, setAbilitiesError] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>(null);
  const [shareBuild, setShareBuild] = useState<SavedBuild | null>(null);
  const [importCode, setImportCode] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [guide, setGuide] = useState<ExpandedBuildGuide | null>(null);
  const [guideHeroId, setGuideHeroId] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const abilityRequestId = useRef(0);
  const guideRequestId = useRef(0);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const character = getCharacter(selectedCharacterId);
  const heroId = getHeroReferenceId(character);
  const recommended = getRecommendedBuild(character);
  const recommendedHelper = getHelper(recommended?.helperId);
  const kazumaPicks = getKazumaPicks(character.rankingId, kazumaOverrides);
  const roleHelpers = getHelpersForRole(character.defaultRole);
  const savedForCharacter = useMemo(
    () => savedBuilds
      .filter((build) => build.characterRankingId === character.rankingId)
      .sort((left, right) => right.updatedAt - left.updatedAt),
    [character.rankingId, savedBuilds],
  );
  const filteredCharacters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CHARACTERS.filter((entry) => !query || entry.label.toLowerCase().includes(query) || entry.name.toLowerCase().includes(query));
  }, [search]);

  useEffect(() => {
    saveSavedBuilds(savedBuilds);
  }, [savedBuilds]);

  useEffect(() => {
    saveKazumaPickOverrides(kazumaOverrides);
  }, [kazumaOverrides]);

  useEffect(() => {
    setDraft(null);
    setCuratedDraft(null);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
  }, [activeTab, selectedCharacterId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (shareMode) setShareMode(null);
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, shareMode]);

  const loadAbilities = async (force = false) => {
    const requestId = ++abilityRequestId.current;
    if (!heroId) {
      setAbilities([]);
      setAbilitiesError("No ability reference ID is available for this fighter yet.");
      return;
    }
    if (!force) {
      const cached = loadCachedAbilities(heroId);
      if (cached?.length) {
        if (requestId !== abilityRequestId.current) return;
        setAbilities(cached);
        setAbilityHeroId(heroId);
        setAbilitiesError(null);
        return;
      }
    }
    setAbilitiesLoading(true);
    setAbilitiesError(null);
    try {
      const loaded = await fetchHeroAbilities(heroId);
      if (requestId !== abilityRequestId.current) return;
      setAbilities(loaded);
      setAbilityHeroId(heroId);
      cacheAbilities(heroId, loaded);
    } catch (error) {
      if (requestId !== abilityRequestId.current) return;
      setAbilities([]);
      setAbilityHeroId(heroId);
      setAbilitiesError(error instanceof Error ? error.message : String(error));
    } finally {
      if (requestId === abilityRequestId.current) setAbilitiesLoading(false);
    }
  };

  const loadExpandedGuide = async (force = false) => {
    if (!heroId || !recommended) return;
    const requestId = ++guideRequestId.current;
    if (!force) {
      const cached = loadCachedBuildGuide(heroId);
      if (cached) {
        setGuide(cached);
        setGuideHeroId(heroId);
        setGuideError(null);
        return;
      }
    }
    setGuideLoading(true);
    setGuideError(null);
    try {
      const source = await fetchBuildGuide(recommended.sourceUrl);
      const parsed = parseBuildGuideHtml(source.sourceUrl, source.html);
      if (requestId !== guideRequestId.current) return;
      setGuide(parsed);
      setGuideHeroId(heroId);
      cacheBuildGuide(heroId, parsed);
    } catch (error) {
      if (requestId !== guideRequestId.current) return;
      setGuide(null);
      setGuideHeroId(heroId);
      setGuideError(error instanceof Error ? error.message : String(error));
    } finally {
      if (requestId === guideRequestId.current) setGuideLoading(false);
    }
  };

  const currentGuide = guideHeroId === heroId ? guide : null;

  useEffect(() => {
    if (activeTab !== "abilities" || !heroId) return;
    if (abilityHeroId === heroId && abilities.length) return;
    void loadAbilities(false);
    // loadAbilities intentionally reads the currently selected hero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, heroId]);

  const beginBlankBuild = () => {
    const timestamp = Date.now();
    setDraft({
      id: createBuildId(),
      characterRankingId: character.rankingId,
      name: `${character.name} build`,
      cardIds: [],
      helperId: null,
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  const copyRecommended = () => {
    if (!recommended) return;
    const timestamp = Date.now();
    setDraft({
      id: createBuildId(),
      characterRankingId: character.rankingId,
      name: "Recommended S6 copy",
      cardIds: [...recommended.cardIds],
      helperId: recommended.helperId,
      notes: "Copied from the DBGS Builds Season 6 recommendation.",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  const copyCuratedBuild = (build: (typeof kazumaPicks)[number]) => {
    const timestamp = Date.now();
    setDraft({
      id: createBuildId(),
      characterRankingId: build.characterRankingId,
      name: build.name,
      cardIds: [...build.cardIds],
      helperId: build.helperId,
      notes: build.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  const chooseCard = (card: CardDefinition) => {
    if (!draft) return;
    const withoutSlot = draft.cardIds.filter((cardId) => getCard(cardId)?.slot !== card.slot);
    setDraft({ ...draft, cardIds: [...withoutSlot, card.id].sort((left, right) => (getCard(left)?.slot ?? 0) - (getCard(right)?.slot ?? 0)) });
  };

  const chooseCuratedCard = (card: CardDefinition) => {
    if (!curatedDraft) return;
    const withoutSlot = curatedDraft.cardIds.filter((cardId) => getCard(cardId)?.slot !== card.slot);
    setCuratedDraft({
      ...curatedDraft,
      cardIds: [...withoutSlot, card.id].sort((left, right) => (getCard(left)?.slot ?? 0) - (getCard(right)?.slot ?? 0)),
    });
  };

  const commitCuratedDraft = () => {
    if (!curatedDraft || !curatedDraft.name.trim() || curatedDraft.cardIds.length !== 3 || !curatedDraft.why.trim()) return;
    const saved: CuratedBuild = {
      ...curatedDraft,
      name: curatedDraft.name.trim(),
      notes: curatedDraft.notes.trim(),
      why: curatedDraft.why.trim(),
    };
    setKazumaOverrides((current) => ({ ...current, [saved.id]: saved }));
    setCuratedDraft(null);
  };

  const resetCuratedBuild = (build: CuratedBuild) => {
    if (!window.confirm(`Reset “${build.name}” to the bundled Kazuma's Pick?`)) return;
    setKazumaOverrides((current) => {
      const next = { ...current };
      delete next[build.id];
      return next;
    });
    setCuratedDraft(null);
  };

  const commitDraft = () => {
    if (!draft || !draft.name.trim() || draft.cardIds.length !== 3) return;
    const saved = { ...draft, name: draft.name.trim(), updatedAt: Date.now() };
    setSavedBuilds((current) => current.some((entry) => entry.id === saved.id)
      ? current.map((entry) => entry.id === saved.id ? saved : entry)
      : [...current, saved]);
    setDraft(null);
  };

  const deleteBuild = (build: SavedBuild) => {
    if (!window.confirm(`Delete “${build.name}”?`)) return;
    setSavedBuilds((current) => current.filter((entry) => entry.id !== build.id));
    if (draft?.id === build.id) setDraft(null);
  };

  const openShare = (build: SavedBuild) => {
    setShareBuild(build);
    setShareMessage(null);
    setShareMode("share");
  };

  const copyShareCode = async () => {
    if (!shareBuild) return;
    const code = encodeBuildShare(shareBuild);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const input = document.createElement("textarea");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setShareMessage("Build code copied. It contains no player ID or app settings.");
  };

  const importSharedBuild = () => {
    try {
      const imported = decodeBuildShare(importCode);
      const timestamp = Date.now();
      const build: SavedBuild = { ...imported, id: createBuildId(), createdAt: timestamp, updatedAt: timestamp };
      setSavedBuilds((current) => [...current, build]);
      setSelectedCharacterId(build.characterRankingId);
      setImportCode("");
      setShareMessage(`Imported “${build.name}”.`);
      setShareMode(null);
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="builds-overlay" role="dialog" aria-modal="true" aria-label="Builds and fighter reference">
      <div className="builds-workspace">
        <aside className="builds-roster">
          <div className="builds-roster-title">
            <span className="eyebrow">Loadout library</span>
            <h2>Fighters</h2>
          </div>
          <label className="build-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fighters" />
          </label>
          <div className="build-roster-list">
            {filteredCharacters.map((entry) => (
              <button
                key={entry.rankingId}
                type="button"
                className={entry.rankingId === character.rankingId ? "selected" : ""}
                onClick={() => setSelectedCharacterId(entry.rankingId)}
              >
                {entry.portrait ? <img src={entry.portrait} alt="" /> : <span>{entry.name.charAt(0)}</span>}
                <div><strong>{entry.name}</strong><small>{roleLabel(entry.defaultRole)}</small></div>
              </button>
            ))}
          </div>
        </aside>

        <main className="builds-main">
          <header className="builds-header">
            <div className="builds-character-lockup">
              {character.portrait && <img src={character.portrait} alt="" />}
              <div>
                <span className="eyebrow">Character workspace</span>
                <h1>{character.name}</h1>
                <span className="build-role-chip"><RoleIcon role={character.defaultRole} /> {roleLabel(character.defaultRole)}</span>
              </div>
            </div>
            <button type="button" className="builds-close" onClick={onClose} aria-label="Close builds"><X /></button>
          </header>

          <div className="builds-tabs" role="tablist">
            <button type="button" className={activeTab === "builds" ? "active" : ""} onClick={() => setActiveTab("builds")}>
              <Layers3 size={16} /> Builds
            </button>
            <button type="button" className={activeTab === "abilities" ? "active" : ""} onClick={() => setActiveTab("abilities")}>
              <BookOpen size={16} /> Skills & passives
            </button>
          </div>

          {activeTab === "builds" ? (
            <div className="builds-content" ref={contentScrollRef}>
              <section className="recommended-build build-surface">
                <div className="build-section-heading">
                  <div><span className="eyebrow">Season 6 reference</span><h3>Recommended build</h3></div>
                  {recommended && <div className="build-heading-actions">
                    <button type="button" className="build-action secondary" onClick={() => void loadExpandedGuide(Boolean(currentGuide))} disabled={guideLoading}>
                      <BookOpen size={15} /> {guideLoading ? "Loading" : currentGuide ? "Refresh guide" : "Full guide"}
                    </button>
                    <button type="button" className="build-action secondary" onClick={copyRecommended}><CopyPlus size={15} /> Save a copy</button>
                  </div>}
                </div>
                {recommended ? (
                  <>
                    <BuildCards cardIds={recommended.cardIds} />
                    <div className="recommended-meta">
                      {recommendedHelper?.portrait && <img src={recommendedHelper.portrait} alt="" />}
                      <span><small>Recommended helper</small><strong>{recommendedHelper?.name ?? "No helper listed"}</strong></span>
                      <i />
                      <span><small>Source</small><strong>DBGS Builds • S6 2026</strong></span>
                    </div>
                  </>
                ) : <div className="build-empty">No recommended build is published for this fighter yet.</div>}
                {guideError && guideHeroId === heroId && <div className="guide-load-error">{guideError}</div>}
              </section>

              <section className="saved-builds build-surface">
                <div className="build-section-heading">
                  <div><span className="eyebrow">Local library</span><h3>Your saved builds</h3></div>
                  <div className="build-heading-actions">
                    <button type="button" className="build-action secondary" onClick={() => { setShareMessage(null); setShareMode("import"); }}><Share2 size={15} /> Import code</button>
                    <button type="button" className="build-action" onClick={beginBlankBuild}><Plus size={15} /> New build</button>
                  </div>
                </div>
                {shareMessage && !shareMode && <div className="build-inline-message">{shareMessage}</div>}
                {savedForCharacter.length ? (
                  <div className="saved-build-list">
                    {savedForCharacter.map((build) => {
                      const helper = getHelper(build.helperId);
                      return (
                        <article key={build.id} className="saved-build-card">
                          <div className="saved-build-copy">
                            <strong>{build.name}</strong>
                            <small>{helper ? `Helper ${helper.name}` : "No helper"}{build.notes ? ` • ${build.notes}` : ""}</small>
                          </div>
                          <BuildCards cardIds={build.cardIds} compact />
                          <div className="saved-build-actions">
                            <button type="button" onClick={() => openShare(build)} aria-label={`Share ${build.name}`}><Share2 size={15} /></button>
                            <button type="button" onClick={() => setDraft({ ...build, cardIds: [...build.cardIds] })} aria-label={`Edit ${build.name}`}><Edit3 size={15} /></button>
                            <button type="button" className="danger" onClick={() => deleteBuild(build)} aria-label={`Delete ${build.name}`}><Trash2 size={15} /></button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="build-empty">No saved builds for {character.name} yet. Copy the recommendation or create your own.</div>}
              </section>

              <section className="kazuma-picks build-surface">
                <div className="build-section-heading">
                  <div><span className="eyebrow">Creator collection • bundled offline</span><h3><Crown size={16} /> Kazuma's Picks</h3></div>
                  <span className="kazuma-picks-badge">KazuCorp curated</span>
                </div>
                {kazumaPicks.length ? (
                  <div className="kazuma-pick-list">
                    {kazumaPicks.map((build) => {
                      const helper = getHelper(build.helperId);
                      return (
                        <article className="kazuma-pick" key={build.id}>
                          <div className="kazuma-pick-copy">
                            <span>Personal recommendation</span>
                            <strong>{build.name}</strong>
                            <p>{build.notes}</p>
                            <blockquote><MessageCircleMore size={14} /><span><small>Why Kazuma picks it</small>{build.why}</span></blockquote>
                            <div>{helper?.portrait && <img src={helper.portrait} alt="" />}<small>Helper</small><b>{helper?.name ?? "None"}</b></div>
                          </div>
                          <BuildCards cardIds={build.cardIds} compact />
                          <div className="kazuma-pick-actions">
                            <button type="button" className="build-action secondary" onClick={() => copyCuratedBuild(build)}><CopyPlus size={15} /> Save a copy</button>
                            <button type="button" className="build-action secondary" onClick={() => setCuratedDraft({ ...build, cardIds: [...build.cardIds] })}><Edit3 size={15} /> Edit pick</button>
                            {kazumaOverrides[build.id] && <button type="button" className="build-action secondary reset" onClick={() => resetCuratedBuild(build)}><RefreshCw size={15} /> Reset</button>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="build-empty">Kazuma has not published a personal pick for {character.name} yet. The live DBGS recommendation is still available above.</div>}
              </section>

              {curatedDraft && (
                <section className="build-editor curated-build-editor build-surface">
                  <div className="build-section-heading">
                    <div><span className="eyebrow">Local creator override</span><h3>Edit Kazuma's Pick</h3></div>
                    <button type="button" className="build-editor-close" onClick={() => setCuratedDraft(null)}><X size={17} /></button>
                  </div>
                  <p className="curated-editor-note">This changes the pick only on this PC. Reset restores the version bundled by KazuCorp; app updates will never erase your local edit.</p>
                  <div className="build-editor-fields curated-editor-fields">
                    <label><span>Pick name</span><input value={curatedDraft.name} maxLength={56} onChange={(event) => setCuratedDraft({ ...curatedDraft, name: event.target.value })} /></label>
                    <label><span>Helper</span><select value={curatedDraft.helperId ?? ""} onChange={(event) => setCuratedDraft({ ...curatedDraft, helperId: event.target.value || null })}>
                      <option value="">None / flexible</option>
                      {roleHelpers.map((helper) => <option key={helper.id} value={helper.id}>{helper.name}</option>)}
                    </select></label>
                    <label className="notes-field"><span>Build summary</span><input value={curatedDraft.notes} maxLength={280} onChange={(event) => setCuratedDraft({ ...curatedDraft, notes: event.target.value })} /></label>
                    <label className="curated-why-field"><span>Why Kazuma picks it</span><textarea value={curatedDraft.why} maxLength={420} onChange={(event) => setCuratedDraft({ ...curatedDraft, why: event.target.value })} /></label>
                  </div>
                  <div className="card-picker-groups">
                    {([1, 2, 3] as const).map((slot) => (
                      <div className="card-picker-group" key={slot}>
                        <div><strong>Card {slot}</strong><small>Choose one</small></div>
                        <div className="card-picker-row">
                          {getCardsForSlot(slot).map((card) => <CardTile key={card.id} card={card} selected={curatedDraft.cardIds.includes(card.id)} onClick={() => chooseCuratedCard(card)} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="build-editor-footer">
                    <span>Saved locally and included in backups</span>
                    <button type="button" className="build-action" disabled={!curatedDraft.name.trim() || curatedDraft.cardIds.length !== 3 || !curatedDraft.why.trim()} onClick={commitCuratedDraft}><Save size={15} /> Save pick</button>
                  </div>
                </section>
              )}

              {currentGuide && <ExpandedGuidePanel guide={currentGuide} />}

              {draft && (
                <section className="build-editor build-surface">
                  <div className="build-section-heading">
                    <div><span className="eyebrow">Build editor</span><h3>{savedBuilds.some((entry) => entry.id === draft.id) ? "Edit build" : "Create build"}</h3></div>
                    <button type="button" className="build-editor-close" onClick={() => setDraft(null)}><X size={17} /></button>
                  </div>
                  <div className="build-editor-fields">
                    <label><span>Build name</span><input value={draft.name} maxLength={48} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                    <label><span>Helper</span><select value={draft.helperId ?? ""} onChange={(event) => setDraft({ ...draft, helperId: event.target.value || null })}>
                      <option value="">None</option>
                      {roleHelpers.map((helper) => <option key={helper.id} value={helper.id}>{helper.name}</option>)}
                    </select></label>
                    <label className="notes-field"><span>Notes</span><input value={draft.notes} maxLength={140} placeholder="Matchups, combo, or playstyle notes" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                  </div>
                  <div className="card-picker-groups">
                    {([1, 2, 3] as const).map((slot) => (
                      <div className="card-picker-group" key={slot}>
                        <div><strong>Card {slot}</strong><small>Choose one</small></div>
                        <div className="card-picker-row">
                          {getCardsForSlot(slot).map((card) => <CardTile key={card.id} card={card} selected={draft.cardIds.includes(card.id)} onClick={() => chooseCard(card)} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="build-editor-footer">
                    <span>{draft.cardIds.length}/3 card slots selected</span>
                    <button type="button" className="build-action" disabled={!draft.name.trim() || draft.cardIds.length !== 3} onClick={commitDraft}><Save size={15} /> Save build</button>
                  </div>
                </section>
              )}

              <p className="build-source-note">Card effects are concise Season 6 summaries. Hover or focus any card to read its effect. Recommendations are attributed to DBGS Builds and may change after balance updates.</p>
            </div>
          ) : (
            <div className="abilities-content" ref={contentScrollRef}>
              <div className="ability-heading build-surface">
                <div><span className="eyebrow">Fighter reference</span><h3>{character.name} skills & passives</h3><p>Loaded from the current DBGS character reference and cached locally for seven days.</p></div>
                <button type="button" className="build-action secondary" onClick={() => void loadAbilities(true)} disabled={abilitiesLoading}><RefreshCw className={abilitiesLoading ? "spin" : ""} size={15} /> Refresh</button>
              </div>
              {abilitiesLoading ? (
                <div className="ability-state build-surface"><RefreshCw className="spin" /><strong>Loading fighter abilities…</strong></div>
              ) : abilitiesError ? (
                <div className="ability-state ability-state--error build-surface"><BookOpen /><strong>Reference unavailable</strong><span>{abilitiesError}</span></div>
              ) : (
                <div className="ability-grid">
                  {abilities.map((ability) => {
                    const Icon = abilityIcon(ability.slot);
                    return (
                      <article className="ability-card build-surface" key={ability.key}>
                        <div className="ability-icon"><Icon /></div>
                        <div><span>{ability.slot}</span><h3>{ability.name}</h3><p>{ability.description}</p></div>
                      </article>
                    );
                  })}
                </div>
              )}
              <p className="build-source-note">Ability wording is reference information and may differ after a new balance patch; the in-game description remains authoritative.</p>
            </div>
          )}
        </main>
      </div>

      {shareMode && (
        <div className="build-share-scrim" role="dialog" aria-modal="true" aria-label={shareMode === "share" ? "Share build" : "Import build"}>
          <section className="build-share-dialog">
            <div className="build-section-heading">
              <div><span className="eyebrow">Local build exchange</span><h3>{shareMode === "share" ? `Share ${shareBuild?.name ?? "build"}` : "Import a build code"}</h3></div>
              <button type="button" className="build-editor-close" onClick={() => setShareMode(null)} aria-label="Close build exchange"><X size={17} /></button>
            </div>
            {shareMode === "share" && shareBuild ? (
              <>
                <p>Send this code through Discord or another message. It contains only the fighter, cards, compatible Helper, build name, and notes.</p>
                <textarea readOnly value={encodeBuildShare(shareBuild)} onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="build-action" onClick={() => void copyShareCode()}><Share2 size={15} /> Copy build code</button>
              </>
            ) : (
              <>
                <p>Paste a code beginning with <strong>SPB1.</strong> The imported build is validated before it is added to your local library.</p>
                <textarea value={importCode} onChange={(event) => setImportCode(event.target.value)} placeholder="SPB1…" autoFocus />
                <button type="button" className="build-action" disabled={!importCode.trim()} onClick={importSharedBuild}><Share2 size={15} /> Import build</button>
              </>
            )}
            {shareMessage && <span className="build-share-message">{shareMessage}</span>}
          </section>
        </div>
      )}
    </div>
  );
}
