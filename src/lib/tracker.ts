import { getCharacter } from "./characters";
import { roleRankFromScore } from "./ranks";
import type { MatchSnapshot, PlayerProfile, RankSnapshot, RoleId } from "../types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayOfRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/,/g, "");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && (value === 0 || value === 1)) return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "mvp"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }
  return null;
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function profileIntegerValue(value: unknown): number | null {
  const direct = numberValue(value);
  if (direct !== null) return Math.max(0, Math.floor(direct));
  if (typeof value === "string") {
    const match = value.trim().match(/^\D*([+-]?\d[\d,]*(?:\.\d+)?)/);
    if (match?.[1]) {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
  }
  if (isRecord(value)) {
    for (const key of ["value", "current", "amount", "count", "level", "score", "total"]) {
      const nested = profileIntegerValue(value[key]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function firstResult(payload: unknown): JsonRecord {
  if (Array.isArray(payload)) {
    const result = payload.find(isRecord);
    if (result) return result;
  }
  if (!isRecord(payload)) throw new Error("The tracker returned an unexpected response.");

  for (const key of ["results", "players", "data"]) {
    const candidates = arrayOfRecords(payload[key]);
    if (candidates[0]) return candidates[0];
  }

  if (typeof payload.nickname === "string") return payload;
  throw new Error("No player was found for that public ID.");
}

function playerRankSnapshot(code: string, raw: JsonRecord): RankSnapshot {
  const directScore =
    numberValue(raw.player_rank) ??
    numberValue(raw.player_rank_score) ??
    numberValue(raw.rank_score) ??
    numberValue(raw.score) ??
    0;
  const ceiling = numberValue(raw.player_rank_next) ?? numberValue(raw.next_rank_score) ?? 6000;
  const floor = numberValue(raw.player_rank_floor) ?? 0;
  return {
    code,
    score: directScore,
    floor,
    ceiling,
    progress: ceiling > floor ? Math.max(0, Math.min(1, (directScore - floor) / (ceiling - floor))) : 0,
  };
}

function playerRankCode(raw: JsonRecord): string {
  for (const value of [raw.player_rank_code, raw.player_rank_tier, raw.rank_label, raw.player_rank]) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
    if (/^[SABCDE](?:[1-4])?$/.test(normalized)) return normalized;
  }
  const score = numberValue(raw.player_rank) ?? numberValue(raw.player_rank_score) ?? numberValue(raw.rank_score) ?? 0;
  if (score >= 6000) return "S";
  if (score >= 4800) return "A";
  if (score >= 3600) return "B";
  if (score >= 2400) return "C";
  return "Unranked";
}

function profileNumber(raw: JsonRecord, keys: string[]): number | null {
  const targets = new Set(keys.map(normalizedKey));
  const skippedBranches = new Set([
    "matches", "matchhistory", "recentmatches", "participants", "players", "teams", "rankings", "rankingscores",
  ]);
  const visited = new Set<unknown>();

  const visit = (value: unknown, depth: number): number | null => {
    if (depth > 8 || visited.has(value)) return null;
    if (isRecord(value)) {
      visited.add(value);
      const label = stringValue(value.label ?? value.name ?? value.title ?? value.key ?? value.slug);
      if (label && targets.has(normalizedKey(label))) {
        for (const key of ["value", "current", "amount", "count", "level", "score", "total"]) {
          const found = profileIntegerValue(value[key]);
          if (found !== null) return found;
        }
      }
      for (const [key, child] of Object.entries(value)) {
        const normalized = normalizedKey(key);
        if (targets.has(normalized)) {
          const found = profileIntegerValue(child);
          if (found !== null) return found;
        }
      }
      for (const [key, child] of Object.entries(value)) {
        if (skippedBranches.has(normalizedKey(key))) continue;
        if (!isRecord(child) && !Array.isArray(child)) continue;
        const found = visit(child, depth + 1);
        if (found !== null) return found;
      }
      return null;
    }
    if (Array.isArray(value)) {
      visited.add(value);
      for (const child of value.slice(0, 100)) {
        const found = visit(child, depth + 1);
        if (found !== null) return found;
      }
    }
    return null;
  };

  return visit(raw, 0);
}

function playerParticipant(match: JsonRecord, nickname: string): JsonRecord | null {
  const data = isRecord(match.data) ? match.data : {};
  const participants = [
    ...arrayOfRecords(match.participants),
    ...arrayOfRecords(data.participants),
  ];
  for (const candidate of [match.participant, match.player, data.participant, data.player]) {
    if (isRecord(candidate)) participants.push(candidate);
  }
  const target = nickname.toLowerCase();
  return participants.find((entry) => booleanValue(entry.is_searched_player ?? entry.isSearchedPlayer) === true)
    ?? participants.find((entry) => {
    const name = stringValue(entry.player_name ?? entry.playerName ?? entry.nickname ?? entry.name);
    return name.toLowerCase() === target;
  }) ?? participants[0] ?? null;
}

function readLoadoutIds(match: JsonRecord, nickname: string): string[] {
  const participant = playerParticipant(match, nickname);
  if (!participant || !isRecord(participant.loadout)) return [];

  const ids: string[] = [];
  for (const key of ["divine_card_ids", "equipped_item_ids", "skill_ids"]) {
    const values = participant.loadout[key];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (typeof value === "string" || typeof value === "number") ids.push(String(value));
    }
  }
  return [...new Set(ids)];
}

const MVP_FLAG_KEYS = new Set([
  "ismvp", "mvp", "hasmvp", "mvptrophy", "hasmvptrophy", "mvpawarded", "matchmvp", "ismatchmvp",
  "bestplayer", "isbestplayer", "hastrophy", "trophy",
]);

const MVP_NAME_KEYS = new Set([
  "mvpplayername", "mvpname", "mvpnickname", "mvpplayer", "bestplayername", "bestplayernickname",
]);

function awardSaysMvp(value: unknown, depth = 0): boolean {
  if (depth > 5) return false;
  if (typeof value === "string") return /\bmvp\b|most\s+valuable\s+player|trophy/i.test(value);
  if (Array.isArray(value)) return value.some((entry) => awardSaysMvp(entry, depth + 1));
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = normalizedKey(key);
    if (/mvp|trophy/.test(normalized)) {
      const flag = booleanValue(child);
      if (flag === true || awardSaysMvp(child, depth + 1)) return true;
    }
    if (/award|medal|badge|achievement|result|icon|type|label|name|title|slug|code/.test(normalized)) {
      return awardSaysMvp(child, depth + 1);
    }
    return false;
  });
}

function mvpSignal(source: JsonRecord, nickname: string, skipParticipants: boolean): boolean | null {
  let explicitFalse = false;
  const target = nickname.toLowerCase();
  const visited = new Set<unknown>();

  const visit = (value: unknown, depth: number): boolean | null => {
    if (depth > 7 || visited.has(value)) return null;
    if (Array.isArray(value)) {
      visited.add(value);
      for (const child of value) {
        const found = visit(child, depth + 1);
        if (found === true) return true;
      }
      return null;
    }
    if (!isRecord(value)) return null;
    visited.add(value);
    for (const [key, child] of Object.entries(value)) {
      const normalized = normalizedKey(key);
      if (skipParticipants && normalized === "participants") continue;
      if (MVP_FLAG_KEYS.has(normalized)) {
        const flag = booleanValue(child);
        if (flag === true) return true;
        if (flag === false) explicitFalse = true;
        if (awardSaysMvp(child)) return true;
      }
      if (MVP_NAME_KEYS.has(normalized)) {
        const reportedName = isRecord(child)
          ? stringValue(child.player_name ?? child.playerName ?? child.nickname ?? child.name)
          : stringValue(child);
        if (reportedName) {
          if (reportedName.toLowerCase() === target) return true;
          explicitFalse = true;
        }
      }
      if (/award|medal|badge|achievement|trophy/.test(normalized) && awardSaysMvp(child)) return true;
    }
    for (const [key, child] of Object.entries(value)) {
      if (skipParticipants && normalizedKey(key) === "participants") continue;
      if (!isRecord(child) && !Array.isArray(child)) continue;
      const found = visit(child, depth + 1);
      if (found === true) return true;
    }
    return null;
  };

  return visit(source, 0) === true ? true : explicitFalse ? false : null;
}

function readMvp(match: JsonRecord, nickname: string): boolean | null {
  // DBGS exposes the searched player's trophy on the match itself. Participant
  // rows currently carry a different per-row MVP flag, so the match value wins.
  const matchSignal = mvpSignal(match, nickname, true);
  if (matchSignal !== null) return matchSignal;
  const participant = playerParticipant(match, nickname);
  if (participant) {
    const participantSignal = mvpSignal(participant, nickname, false);
    if (participantSignal !== null) return participantSignal;
  }
  return null;
}

function readRpChange(match: JsonRecord, nickname: string): number | null {
  const participant = playerParticipant(match, nickname);
  for (const source of [match, participant]) {
    if (!source) continue;
    for (const key of ["rp_change", "rank_score_change", "score_delta", "rank_points_change"]) {
      const value = numberValue(source[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function starCollectionLevel(raw: JsonRecord): number | null {
  const collection = isRecord(raw.collection) ? raw.collection : null;
  if (collection) {
    for (const key of ["actual", "current", "level", "total", "value"]) {
      const value = profileIntegerValue(collection[key]);
      if (value !== null && value >= 1) return Math.min(255, value);
    }
  }
  const value = profileNumber(raw, ["star_collection", "star_collection_level", "star_level", "collection_level", "player_level"]);
  return value !== null && value >= 1 ? Math.min(255, value) : null;
}

function normalizeMatch(match: JsonRecord, nickname: string): MatchSnapshot {
  const characterRankingId = String(match.character_ranking_id ?? match.character_id ?? "unknown");
  const trackerName = stringValue(match.character_name);
  const knownCharacter = getCharacter(characterRankingId, trackerName);
  const data = isRecord(match.data) ? match.data : {};
  return {
    characterRankingId,
    characterName: trackerName || knownCharacter.name,
    outcome: stringValue(match.outcome, "Unknown"),
    gameType: stringValue(match.game_type, "Battle"),
    teamFormat: stringValue(match.team_format, ""),
    playedAt: stringValue(match.played_at),
    level: numberValue(match.character_level),
    knockouts: numberValue(match.knockouts),
    assists: numberValue(match.assists),
    damage: numberValue(match.damage),
    durationSeconds: numberValue(data.duration_seconds),
    isMvp: readMvp(match, nickname),
    rpChange: readRpChange(match, nickname),
    loadoutIds: readLoadoutIds(match, nickname),
  };
}

function roleScore(rawScores: JsonRecord, role: RoleId): number {
  return numberValue(rawScores[role]) ?? numberValue(rawScores[`${role}_score`]) ?? 0;
}

export function normalizeTrackerResponse(payload: unknown): PlayerProfile {
  const raw = firstResult(payload);
  const nickname = stringValue(raw.nickname, "Player");
  const rankScores = isRecord(raw.rank_scores) ? raw.rank_scores : {};
  const matches = arrayOfRecords(raw.matches).sort((left, right) => {
    const leftTime = Date.parse(stringValue(left.played_at)) || 0;
    const rightTime = Date.parse(stringValue(right.played_at)) || 0;
    return rightTime - leftTime;
  });
  const playerRank = playerRankCode(raw);
  const normalizedMatches = matches.slice(0, 20).map((match) => normalizeMatch(match, nickname));

  return {
    nickname,
    playerRank: playerRankSnapshot(playerRank, raw),
    votes: profileNumber(raw, ["total_votes_received", "votes_received", "total_votes", "votes", "field_15"]),
    zeni: profileNumber(raw, ["zeni", "zenny", "total_zeni"]),
    roleRanks: {
      damage: roleRankFromScore(roleScore(rankScores, "damage")),
      tank: roleRankFromScore(roleScore(rankScores, "tank")),
      technical: roleRankFromScore(roleScore(rankScores, "technical")),
    },
    matches: normalizedMatches,
    latestMatch: normalizedMatches[0] ?? null,
    lastSeenAt: stringValue(raw.last_seen_at) || null,
    starCollectionLevel: starCollectionLevel(raw),
  };
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "Never";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Unknown";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return [hours, minutes, remainder].map((unit) => String(unit).padStart(2, "0")).join(":");
}
