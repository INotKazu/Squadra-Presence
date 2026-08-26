import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Clock3, Crosshair, Gamepad2, Medal, Shield, Sparkles, Swords, Trophy, X } from "lucide-react";
import { getCharacter } from "../lib/characters";
import { roleRankObservations } from "../lib/journal";
import { formatDuration, formatRelativeTime } from "../lib/tracker";
import { roleLabel } from "../lib/ranks";
import type { MatchJournalEntry, PlayerJournal, RankJournalEntry, RoleId } from "../types";
import { RoleIcon } from "./RoleIcon";

interface HistoryWorkspaceProps {
  journal: PlayerJournal;
  nickname: string;
  onClose: () => void;
}

type RoleFilter = "all" | RoleId;

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function favoriteFighter(matches: MatchJournalEntry[]): string {
  const counts = new Map<string, { name: string; count: number }>();
  for (const match of matches) {
    const fighter = getCharacter(match.characterRankingId, match.characterName);
    const current = counts.get(fighter.rankingId) ?? { name: fighter.name, count: 0 };
    counts.set(fighter.rankingId, { name: current.name, count: current.count + 1 });
  }
  return [...counts.values()].sort((left, right) => right.count - left.count)[0]?.name ?? "—";
}

function RankTrend({ role, ranks }: { role: RoleId; ranks: RankJournalEntry[] }) {
  const chronological = roleRankObservations(ranks, role);
  const values = chronological.map((entry) => entry.scores[role]);
  const latest = chronological.at(-1);
  const first = chronological[0];
  const width = 250;
  const height = 62;
  const inset = 5;
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, maximum - minimum);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : inset + (index / (values.length - 1)) * (width - inset * 2);
    const y = height - inset - ((value - minimum) / range) * (height - inset * 2);
    return `${x},${y}`;
  }).join(" ");
  const delta = latest && first ? latest.scores[role] - first.scores[role] : 0;

  return (
    <article className={`history-rank-trend history-rank-trend--${role}`}>
      <div><RoleIcon role={role} /><span><small>{roleLabel(role)}</small><strong>{latest?.codes[role] ?? "—"} • {latest?.scores[role] ?? 0} RP</strong></span><i>{delta > 0 ? `+${delta}` : delta}</i></div>
      <svg className="history-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${roleLabel(role)} rank score trend`}>
        <line x1={inset} y1={height - inset} x2={width - inset} y2={height - inset} />
        {points && <polyline points={points} />}
        {values.length === 1 && <circle cx={width / 2} cy={height / 2} r="3" />}
      </svg>
      <small>{chronological.length > 1 ? `${chronological.length - 1} RP change${chronological.length === 2 ? "" : "s"} recorded` : "No RP movement recorded yet"}</small>
    </article>
  );
}

export function HistoryWorkspace({ journal, nickname, onClose }: HistoryWorkspaceProps) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [selectedMatch, setSelectedMatch] = useState<MatchJournalEntry | null>(null);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedMatch) setSelectedMatch(null);
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, selectedMatch]);

  const matches = useMemo(() => filter === "all" ? journal.matches : journal.matches.filter((match) => match.role === filter), [filter, journal.matches]);
  const wins = matches.filter((match) => /win|victory/i.test(match.outcome)).length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;
  const averageKos = average(matches.map((match) => match.knockouts));
  const averageAssists = average(matches.map((match) => match.assists));
  const averageDamage = average(matches.map((match) => match.damage));
  const knownMvpMatches = matches.filter((match) => match.isMvp !== null);
  const mvpCount = matches.filter((match) => match.isMvp).length;

  return (
    <div className="history-overlay" role="dialog" aria-modal="true" aria-label="Match and rank history">
      <div className="history-workspace">
        <header className="history-header">
          <div><span className="eyebrow">Local performance journal</span><h1>{nickname}'s battle history</h1><p>Saved only on this PC and included in app backups.</p></div>
          <button type="button" className="builds-close" onClick={onClose} aria-label="Close history"><X /></button>
        </header>

        <div className="history-filter" role="tablist" aria-label="Filter matches by role">
          {(["all", "damage", "tank", "technical"] as RoleFilter[]).map((role) => (
            <button type="button" key={role} className={filter === role ? "active" : ""} onClick={() => setFilter(role)}>
              {role === "all" ? <Activity size={14} /> : <RoleIcon role={role} />}{role === "all" ? "All roles" : roleLabel(role)}
            </button>
          ))}
        </div>

        <main className="history-content">
          <section className="history-summary-grid">
            <article><Swords /><span>Saved matches</span><strong>{matches.length}</strong></article>
            <article><Trophy /><span>Win rate</span><strong>{matches.length ? `${winRate}%` : "—"}</strong></article>
            <article><Crosshair /><span>Average KOs</span><strong>{averageKos === null ? "—" : averageKos.toFixed(1)}</strong></article>
            <article><Shield /><span>Average assists</span><strong>{averageAssists === null ? "—" : averageAssists.toFixed(1)}</strong></article>
            <article><BarChart3 /><span>Average damage</span><strong>{averageDamage === null ? "—" : Math.round(averageDamage).toLocaleString()}</strong></article>
            <article><Medal /><span>MVP awards</span><strong>{knownMvpMatches.length ? mvpCount : "—"}</strong></article>
            <article><Activity /><span>Most played</span><strong>{favoriteFighter(matches)}</strong></article>
          </section>

          <section className="history-ranks">
            <div className="history-section-title"><span className="eyebrow">RP journal</span><h2>Rank movement</h2></div>
            <div className="history-rank-grid">
              {(["damage", "tank", "technical"] as RoleId[]).map((role) => <RankTrend key={role} role={role} ranks={journal.ranks} />)}
            </div>
          </section>

          <section className="history-matches">
            <div className="history-section-title"><span className="eyebrow">Tracker archive</span><h2>Recent completed matches</h2></div>
            {matches.length ? (
              <div className="history-match-list">
                {matches.map((match) => {
                  const fighter = getCharacter(match.characterRankingId, match.characterName);
                  const won = /win|victory/i.test(match.outcome);
                  return (
                    <button type="button" className="history-match" key={match.id} onClick={() => setSelectedMatch(match)}>
                      <div className="history-match-fighter">{fighter.portrait && <img src={fighter.portrait} alt="" />}<span><strong>{fighter.name}{match.isMvp && <em className="history-mvp-badge"><Medal /> MVP</em>}</strong><small><RoleIcon role={match.role} /> {roleLabel(match.role)} • {match.teamFormat || match.gameType}</small></span></div>
                      <strong className={won ? "history-result-win" : "history-result-loss"}>{match.outcome}</strong>
                      <div><small>KOs</small><strong>{match.knockouts ?? "—"}</strong></div>
                      <div><small>Assists</small><strong>{match.assists ?? "—"}</strong></div>
                      <div><small>Damage</small><strong>{match.damage?.toLocaleString() ?? "—"}</strong></div>
                      <time>{formatRelativeTime(match.playedAt)}</time>
                    </button>
                  );
                })}
              </div>
            ) : <div className="history-empty"><Activity /><strong>No saved matches for this filter yet</strong><span>Sync after completed matches and the local journal will grow automatically.</span></div>}
          </section>
        </main>
        {selectedMatch && (
          <div className="history-detail-scrim" onMouseDown={(event) => event.currentTarget === event.target && setSelectedMatch(null)}>
            <aside className="history-detail-drawer" aria-label="Match details">
              <header>
                <div><span className="eyebrow">Completed match detail</span><h2>{getCharacter(selectedMatch.characterRankingId, selectedMatch.characterName).name}</h2></div>
                <button type="button" className="builds-close" onClick={() => setSelectedMatch(null)} aria-label="Close match details"><X /></button>
              </header>
              <div className="history-detail-hero">
                {getCharacter(selectedMatch.characterRankingId, selectedMatch.characterName).portrait && <img src={getCharacter(selectedMatch.characterRankingId, selectedMatch.characterName).portrait} alt="" />}
                <div><span className={/win|victory/i.test(selectedMatch.outcome) ? "win" : "loss"}>{selectedMatch.outcome}</span><h3>{roleLabel(selectedMatch.role)} • {selectedMatch.teamFormat || selectedMatch.gameType}</h3><p>{selectedMatch.playedAt ? new Date(selectedMatch.playedAt).toLocaleString() : "Completion time unavailable"}</p></div>
              </div>
              <div className="history-detail-highlight">
                <Medal />
                <div><small>MVP result</small><strong>{selectedMatch.isMvp === true ? "MVP awarded" : selectedMatch.isMvp === false ? "Not MVP" : "Not reported by tracker"}</strong></div>
              </div>
              <div className="history-detail-grid">
                <article><Crosshair /><small>Knockouts</small><strong>{selectedMatch.knockouts ?? "—"}</strong></article>
                <article><Shield /><small>Assists</small><strong>{selectedMatch.assists ?? "—"}</strong></article>
                <article><BarChart3 /><small>Damage</small><strong>{selectedMatch.damage?.toLocaleString() ?? "—"}</strong></article>
                <article><Sparkles /><small>Fighter level</small><strong>{selectedMatch.level ?? "—"}</strong></article>
                <article><Clock3 /><small>Duration</small><strong>{selectedMatch.durationSeconds === null ? "—" : formatDuration(selectedMatch.durationSeconds)}</strong></article>
                <article><Activity /><small>RP change</small><strong className={selectedMatch.rpChange && selectedMatch.rpChange < 0 ? "negative" : "positive"}>{selectedMatch.rpChange === null ? "Not reported" : `${selectedMatch.rpChange > 0 ? "+" : ""}${selectedMatch.rpChange}`}</strong></article>
              </div>
              <section className="history-detail-loadout">
                <div><Gamepad2 /><span><small>Captured loadout IDs</small><strong>{selectedMatch.loadoutIds.length ? `${selectedMatch.loadoutIds.length} entries` : "No loadout data"}</strong></span></div>
                {selectedMatch.loadoutIds.length > 0 && <ul>{selectedMatch.loadoutIds.map((id) => <li key={id}>{id}</li>)}</ul>}
              </section>
              <p className="history-detail-note">MVP and per-match RP appear only when the public tracker explicitly reports them; the app never guesses from damage or KOs.</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
