import { getCharacter } from "./characters";
import { seasonIdForTimestamp } from "./seasons";
import type {
  JournalStore,
  MatchJournalEntry,
  MatchSnapshot,
  PlayerJournal,
  PlayerProfile,
  RankJournalEntry,
  RoleId,
} from "../types";

const JOURNAL_KEY = "squadra-presence.player-journals.v1";
const MAX_MATCHES = 50;
const MAX_RANK_SNAPSHOTS = 100;

export const EMPTY_PLAYER_JOURNAL: PlayerJournal = { matches: [], ranks: [] };

function trimPerSeason<T>(entries: T[], seasonId: (entry: T) => string, limit: number): T[] {
  const counts = new Map<string, number>();
  return entries.filter((entry) => {
    const id = seasonId(entry);
    const count = counts.get(id) ?? 0;
    if (count >= limit) return false;
    counts.set(id, count + 1);
    return true;
  });
}

function matchId(match: MatchSnapshot): string {
  return [match.playedAt, match.characterRankingId, match.outcome, match.gameType, match.teamFormat].join("|");
}

function isFiniteNullable(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function sanitizeMatchJournalEntry(value: unknown): MatchJournalEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MatchJournalEntry>;
  const valid = typeof candidate.id === "string"
    && typeof candidate.characterRankingId === "string"
    && typeof candidate.characterName === "string"
    && typeof candidate.outcome === "string"
    && typeof candidate.gameType === "string"
    && typeof candidate.teamFormat === "string"
    && typeof candidate.playedAt === "string"
    && isFiniteNullable(candidate.level)
    && isFiniteNullable(candidate.knockouts)
    && isFiniteNullable(candidate.assists)
    && isFiniteNullable(candidate.damage)
    && isFiniteNullable(candidate.durationSeconds)
    && Array.isArray(candidate.loadoutIds)
    && candidate.loadoutIds.every((entry) => typeof entry === "string")
    && ["damage", "tank", "technical"].includes(candidate.role ?? "")
    && typeof candidate.observedAt === "number";
  if (!valid) return null;
  return {
    ...(candidate as MatchJournalEntry),
    seasonId: seasonIdForTimestamp(candidate.playedAt || candidate.observedAt),
    isMvp: typeof candidate.isMvp === "boolean" ? candidate.isMvp : null,
    rpChange: isFiniteNullable(candidate.rpChange) ? candidate.rpChange : null,
  };
}

function roleNumberRecord(value: unknown): value is Record<RoleId, number> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<RoleId, number>>;
  return [candidate.damage, candidate.tank, candidate.technical].every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function roleStringRecord(value: unknown): value is Record<RoleId, string> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<RoleId, string>>;
  return [candidate.damage, candidate.tank, candidate.technical].every((entry) => typeof entry === "string");
}

function sanitizeRankJournalEntry(value: unknown): RankJournalEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RankJournalEntry>;
  const valid = typeof candidate.observedAt === "number"
    && (candidate.matchPlayedAt === null || typeof candidate.matchPlayedAt === "string")
    && roleNumberRecord(candidate.scores)
    && roleStringRecord(candidate.codes);
  if (!valid) return null;
  return {
    ...(candidate as RankJournalEntry),
    seasonId: seasonIdForTimestamp(candidate.observedAt),
  };
}

export function sanitizePlayerJournal(value: unknown): PlayerJournal {
  if (!value || typeof value !== "object") return EMPTY_PLAYER_JOURNAL;
  const candidate = value as Partial<PlayerJournal>;
  const matches = Array.isArray(candidate.matches)
    ? trimPerSeason(
      candidate.matches.map(sanitizeMatchJournalEntry).filter((match): match is MatchJournalEntry => Boolean(match)).map((match) => {
        const fighter = getCharacter(match.characterRankingId, match.characterName);
        return { ...match, characterName: fighter.name, role: fighter.defaultRole };
      }),
      (match) => match.seasonId,
      MAX_MATCHES,
    )
    : [];
  return {
    matches,
    ranks: Array.isArray(candidate.ranks)
      ? trimPerSeason(candidate.ranks.map(sanitizeRankJournalEntry).filter((rank): rank is RankJournalEntry => Boolean(rank)), (rank) => rank.seasonId, MAX_RANK_SNAPSHOTS)
      : [],
  };
}

export function sanitizeJournalStore(value: unknown): JournalStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: JournalStore = {};
  for (const [publicId, journal] of Object.entries(value)) {
    if (/^[a-f0-9-]{36}$/i.test(publicId)) result[publicId.toLowerCase()] = sanitizePlayerJournal(journal);
  }
  return result;
}

export function loadJournalStore(): JournalStore {
  if (typeof window === "undefined") return {};
  try {
    const saved = window.localStorage.getItem(JOURNAL_KEY);
    return saved ? sanitizeJournalStore(JSON.parse(saved)) : {};
  } catch {
    return {};
  }
}

export function saveJournalStore(store: JournalStore): void {
  if (typeof window !== "undefined") window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(sanitizeJournalStore(store)));
}

export function loadPlayerJournal(publicId: string): PlayerJournal {
  const key = publicId.trim().toLowerCase();
  return key ? loadJournalStore()[key] ?? EMPTY_PLAYER_JOURNAL : EMPTY_PLAYER_JOURNAL;
}

export function roleRankObservations(ranks: RankJournalEntry[], role: RoleId): RankJournalEntry[] {
  const chronological = [...ranks].sort((left, right) => left.observedAt - right.observedAt);
  return chronological.filter((entry, index) => index === 0 || entry.scores[role] !== chronological[index - 1]?.scores[role]);
}

function rankEntry(profile: PlayerProfile, observedAt: number): RankJournalEntry {
  return {
    seasonId: seasonIdForTimestamp(observedAt),
    observedAt,
    matchPlayedAt: profile.latestMatch?.playedAt || null,
    scores: {
      damage: profile.roleRanks.damage.score,
      tank: profile.roleRanks.tank.score,
      technical: profile.roleRanks.technical.score,
    },
    codes: {
      damage: profile.roleRanks.damage.code,
      tank: profile.roleRanks.tank.code,
      technical: profile.roleRanks.technical.code,
    },
  };
}

function sameRankObservation(left: RankJournalEntry, right: RankJournalEntry): boolean {
  return left.seasonId === right.seasonId
    && left.matchPlayedAt === right.matchPlayedAt
    && (["damage", "tank", "technical"] as RoleId[]).every((role) => left.scores[role] === right.scores[role]);
}

export function mergePlayerJournal(current: PlayerJournal, profile: PlayerProfile, observedAt = Date.now()): PlayerJournal {
  const sourceMatches = profile.matches.length ? profile.matches : profile.latestMatch ? [profile.latestMatch] : [];
  const incoming = sourceMatches.map<MatchJournalEntry>((match) => ({
      ...match,
      id: matchId(match),
      seasonId: seasonIdForTimestamp(match.playedAt),
      role: getCharacter(match.characterRankingId, match.characterName).defaultRole,
      observedAt,
    }));
  const incomingById = new Map(incoming.map((match) => [match.id, match]));
  const repairedExisting = current.matches.map((existing) => {
    const updated = incomingById.get(existing.id);
    if (!updated) return existing;
    incomingById.delete(existing.id);
    return {
      ...updated,
      level: updated.level ?? existing.level,
      knockouts: updated.knockouts ?? existing.knockouts,
      assists: updated.assists ?? existing.assists,
      damage: updated.damage ?? existing.damage,
      durationSeconds: updated.durationSeconds ?? existing.durationSeconds,
      isMvp: updated.isMvp ?? existing.isMvp,
      rpChange: updated.rpChange ?? existing.rpChange,
      loadoutIds: updated.loadoutIds.length ? updated.loadoutIds : existing.loadoutIds,
      observedAt: existing.observedAt,
    };
  });
  const matches = trimPerSeason(
    [...incomingById.values(), ...repairedExisting]
      .sort((left, right) => (Date.parse(right.playedAt) || right.observedAt) - (Date.parse(left.playedAt) || left.observedAt)),
    (match) => match.seasonId,
    MAX_MATCHES,
  );
  const nextRank = rankEntry(profile, observedAt);
  const ranks = current.ranks[0] && sameRankObservation(current.ranks[0], nextRank)
    ? current.ranks
    : trimPerSeason([nextRank, ...current.ranks], (rank) => rank.seasonId, MAX_RANK_SNAPSHOTS);
  return { matches, ranks };
}

export function recordPlayerJournal(profile: PlayerProfile, publicId: string): PlayerJournal {
  const key = publicId.trim().toLowerCase();
  if (!key) return EMPTY_PLAYER_JOURNAL;
  const store = loadJournalStore();
  const next = mergePlayerJournal(store[key] ?? EMPTY_PLAYER_JOURNAL, profile);
  store[key] = next;
  saveJournalStore(store);
  return next;
}
