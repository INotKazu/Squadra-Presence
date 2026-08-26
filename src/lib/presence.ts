import { getCharacter } from "./characters";
import { getHelper } from "./helpers";
import { rankAssetKey, roleLabel } from "./ranks";
import type { AppSettings, PlayerProfile, PresencePayload, RankCode, RoleId } from "../types";

export interface ActiveSelection {
  characterId: string;
  characterName: string;
  role: RoleId;
  rank: string;
  largeImageKey?: string;
  portrait?: string;
  helperId?: string;
  helperName?: string;
  helperPortrait?: string;
}

export function deriveSelection(settings: AppSettings, profile: PlayerProfile | null): ActiveSelection {
  const trackedMatch = profile?.latestMatch;
  const character = settings.source === "tracker" && trackedMatch
    ? getCharacter(trackedMatch.characterRankingId, trackedMatch.characterName)
    : getCharacter(settings.characterRankingId);
  // A fighter's role is authoritative. This also repairs stale v0.2 settings where
  // a manually selected fighter could retain the previously selected role.
  const role = character.defaultRole;
  const rank =
    settings.source === "tracker" && profile ? profile.roleRanks[role].code : settings.manualRank;
  const assignedHelper = getHelper(settings.helperAssignments[character.rankingId]);
  const helper = assignedHelper?.role === role ? assignedHelper : null;

  return {
    characterId: character.rankingId,
    characterName: character.label,
    role,
    rank,
    largeImageKey: character.assetKey,
    portrait: character.portrait,
    helperId: helper?.id,
    helperName: helper?.label,
    helperPortrait: helper?.portrait,
  };
}

export function buildPresence(selection: ActiveSelection, startedAt: number): PresencePayload {
  const rankKey = rankAssetKey(selection.rank);
  const payload: PresencePayload = {
    details: selection.characterName,
    state: [
      `ROLE ${roleLabel(selection.role).toUpperCase()}`,
      `RANK ${selection.rank}`,
      selection.helperName ? `HELPER ${selection.helperName.toUpperCase()}` : null,
    ].filter(Boolean).join(" │ "),
    largeImageText: selection.characterName,
    smallImageText: [
      `${roleLabel(selection.role)} Rank • ${selection.rank}`,
      selection.helperName ? `Helper • ${selection.helperName}` : null,
    ].filter(Boolean).join(" • "),
    startTimestamp: startedAt,
  };
  if (selection.largeImageKey) payload.largeImageKey = selection.largeImageKey;
  if (rankKey) payload.smallImageKey = rankKey;
  return payload;
}

export function isSelectableRank(value: string): value is RankCode {
  return /^[SABC][1-4]$/.test(value);
}
