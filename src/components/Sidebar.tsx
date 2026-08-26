import { Clock3, Radio, Swords, Trophy } from "lucide-react";
import { rankAssetPath, roleLabel } from "../lib/ranks";
import type { ActiveSelection } from "../lib/presence";
import type { PlayerProfile, RoleGainHistory } from "../types";
import { RankProgress } from "./RankProgress";
import { RoleIcon } from "./RoleIcon";

interface SidebarProps {
  selection: ActiveSelection;
  profile: PlayerProfile | null;
  rankGainHistory: RoleGainHistory;
  elapsedSeconds: number;
}

export function Sidebar({ selection, profile, rankGainHistory, elapsedSeconds }: SidebarProps) {
  const rankAsset = rankAssetPath(selection.rank);
  const match = profile?.latestMatch;
  const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <aside className="app-sidebar">
      <div className="brand-lockup">
        <img src="/assets/app-icon.png" alt="" />
        <div>
          <span>DRAGON BALL GEKISHIN</span>
          <strong>SQUADRA PRESENCE</strong>
        </div>
      </div>

      <div className="fighter-stage">
        <div className="fighter-aura" />
        {selection.portrait ? (
          <img className="fighter-art" src={selection.portrait} alt={selection.characterName} />
        ) : (
          <div className="fighter-placeholder">
            <img src="/assets/app-icon.png" alt="" />
            <span>Character art<br />not uploaded yet</span>
          </div>
        )}
        <div className="fighter-vignette" />
      </div>

      <div className="fighter-card">
        <span className="eyebrow">Currently displaying</span>
        <h1>{selection.characterName}</h1>
        <div className="fighter-subtitle">
          {selection.characterId === "3875954222" ? "The father of Goku" : "Latest selected fighter"}
        </div>

        <div className="role-rank-row">
          <div>
            <RoleIcon role={selection.role} size="large" />
            <span>{roleLabel(selection.role)}</span>
          </div>
          <i />
          <div>
            {rankAsset ? <img src={rankAsset} alt="" /> : <Trophy size={27} />}
            <span>{selection.rank} ranked</span>
          </div>
        </div>

        {profile?.roleRanks[selection.role] && (
          <RankProgress role={selection.role} snapshot={profile.roleRanks[selection.role]} history={rankGainHistory} />
        )}

        {selection.helperName && (
          <div className="sidebar-helper">
            {selection.helperPortrait && <img src={selection.helperPortrait} alt="" />}
            <span><small>Equipped helper</small><strong>{selection.helperName}</strong></span>
          </div>
        )}

        <div className="match-mini-grid">
          <div><Swords size={15} /><span>Result</span><strong>{match?.outcome ?? "Manual"}</strong></div>
          <div><Radio size={15} /><span>Mode</span><strong>{match?.teamFormat || "Ranked"}</strong></div>
        </div>

        <div className="time-active">
          <Clock3 size={18} />
          <span>Time active</span>
          <strong>{hours}:{minutes}:{seconds}</strong>
        </div>
      </div>

      <footer>
        <span>Unofficial fan project • Created by Kazuma</span>
        <span>Discord: kazumavt • KazuCorp</span>
      </footer>
    </aside>
  );
}
