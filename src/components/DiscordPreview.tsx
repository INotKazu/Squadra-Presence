import { Clock3, Gamepad2 } from "lucide-react";
import { rankAssetPath, roleLabel } from "../lib/ranks";
import { formatDuration } from "../lib/tracker";
import type { ActiveSelection } from "../lib/presence";

interface DiscordPreviewProps {
  selection: ActiveSelection;
  nickname: string;
  elapsedSeconds: number;
  live: boolean;
}

export function DiscordPreview({ selection, nickname, elapsedSeconds, live }: DiscordPreviewProps) {
  const rankAsset = rankAssetPath(selection.rank);
  const avatarInitial = nickname.trim().charAt(0).toLocaleUpperCase() || "S";
  return (
    <section className="discord-preview shell-panel" aria-label="Discord Rich Presence preview">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Discord Rich Presence</span>
          <h2>Live profile preview</h2>
        </div>
        <span className={`live-badge ${live ? "live-badge--on" : ""}`}>
          <span /> {live ? "Broadcasting" : "Preview"}
        </span>
      </div>

      <div className="discord-card">
        <div className="discord-profilebar">
          <div className="discord-avatar" aria-label={`${nickname} profile initial`}>{avatarInitial}</div>
          <div>
            <strong>{nickname}</strong>
            <span>Online</span>
          </div>
          <span className="online-dot" />
        </div>

        <div className="discord-activity">
          <span className="discord-label">
            <Gamepad2 size={13} /> Playing a game
          </span>
          <div className="discord-presence-row">
            <div className="presence-art">
              {selection.portrait ? (
                <img src={selection.portrait} alt="" />
              ) : (
                <img className="presence-fallback" src="/assets/app-icon.png" alt="" />
              )}
              {rankAsset && <img className="presence-rank" src={rankAsset} alt={`${selection.rank} rank`} />}
            </div>
            <div className="presence-copy">
              <h3>DRAGON BALL GEKISHIN SQUADRA</h3>
              <strong>{selection.characterName}</strong>
              <span>
                ROLE {roleLabel(selection.role).toUpperCase()} │ RANK {selection.rank}
                {selection.helperName ? ` │ HELPER ${selection.helperName.toUpperCase()}` : ""}
              </span>
              <span className="elapsed">
                <Clock3 size={13} /> {formatDuration(elapsedSeconds)} elapsed
              </span>
            </div>
          </div>
        </div>

        <div className="discord-footer">
          <span>ROLE</span>
          <strong>{roleLabel(selection.role)}</strong>
          <i />
          <span>RANK</span>
          <strong>{selection.rank}</strong>
          {selection.helperName && (
            <>
              <i />
              <span>HELPER</span>
              <strong>{selection.helperName}</strong>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
