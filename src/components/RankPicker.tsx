import { Check } from "lucide-react";
import { ORDERED_RANKS, rankAssetPath } from "../lib/ranks";
import type { RankCode } from "../types";

interface RankPickerProps {
  value: RankCode;
  onChange: (rank: RankCode) => void;
  disabled?: boolean;
}

export function RankPicker({ value, onChange, disabled = false }: RankPickerProps) {
  return (
    <div className={`rank-picker ${disabled ? "rank-picker--disabled" : ""}`}>
      {ORDERED_RANKS.map((rank) => (
        <button
          key={rank}
          type="button"
          className={rank === value ? "selected" : ""}
          onClick={() => onChange(rank)}
          disabled={disabled}
          aria-label={`Select ${rank}`}
          title={rank}
        >
          <img src={rankAssetPath(rank)} alt="" />
          <span>{rank}</span>
          {rank === value && <Check className="rank-check" size={12} />}
        </button>
      ))}
    </div>
  );
}
