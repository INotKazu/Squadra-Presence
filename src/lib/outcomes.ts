import type { MatchJournalEntry } from "../types";

export type MatchOutcomeKind = "win" | "loss" | "void" | "unknown";

export function matchOutcomeKind(outcome: string): MatchOutcomeKind {
  const normalized = outcome.trim().toLowerCase();
  if (/\b(?:win|won|victory)\b/.test(normalized)) return "win";
  if (/\b(?:void|cancelled|canceled|draw|no\s+contest)\b/.test(normalized)) return "void";
  if (/\b(?:loss|lose|lost|defeat|defeated)\b/.test(normalized)) return "loss";
  return "unknown";
}

export function matchWinRate(matches: MatchJournalEntry[]): number | null {
  const decided = matches.map((match) => matchOutcomeKind(match.outcome)).filter((outcome) => outcome === "win" || outcome === "loss");
  if (!decided.length) return null;
  return Math.round((decided.filter((outcome) => outcome === "win").length / decided.length) * 100);
}

export function performanceMatches(matches: MatchJournalEntry[]): MatchJournalEntry[] {
  return matches.filter((match) => matchOutcomeKind(match.outcome) !== "void");
}

