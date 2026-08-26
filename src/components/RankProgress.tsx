import { TrendingUp } from "lucide-react";
import { estimatedWinsRemaining, rankDivisionPoints, rankPointsRemaining } from "../lib/progress";
import { nextRankCode, roleLabel } from "../lib/ranks";
import type { RankSnapshot, RoleGainHistory, RoleId } from "../types";

interface RankProgressProps {
  role: RoleId;
  snapshot: RankSnapshot;
  history: RoleGainHistory;
  compact?: boolean;
}

export function RankProgress({ role, snapshot, history, compact = false }: RankProgressProps) {
  const nextRank = nextRankCode(snapshot.code);
  const points = rankDivisionPoints(snapshot);
  const remaining = rankPointsRemaining(snapshot);
  const wins = estimatedWinsRemaining(snapshot, history, role);
  const percentage = Math.max(0, Math.min(100, snapshot.progress * 100));

  return (
    <div className={`rank-progress ${compact ? "rank-progress--compact" : ""}`}>
      <div className="rank-progress-head">
        {!compact && <TrendingUp size={15} />}
        <strong>{compact ? snapshot.code : `${roleLabel(role)} • ${snapshot.code}`}</strong>
        <span>{nextRank ? `→ ${nextRank}` : "Max division"}</span>
      </div>
      <div className="rank-progress-track" aria-label={`${Math.round(percentage)}% progress to ${nextRank ?? "maximum rank"}`}>
        <i style={{ width: `${percentage}%` }} />
      </div>
      {!compact && (
        <div className="rank-progress-foot">
          <span>{points.earned}/{points.total} RP</span>
          <span>{nextRank ? `${remaining} RP remaining` : `${snapshot.score} total RP`}</span>
          <strong>{wins ? `≈ ${wins} win${wins === 1 ? "" : "s"}` : nextRank ? "Learning your win pace" : "Top rank"}</strong>
        </div>
      )}
    </div>
  );
}
