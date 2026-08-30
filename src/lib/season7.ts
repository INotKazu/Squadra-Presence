export interface SeasonSevenMilestone {
  date: string;
  title: string;
  detail: string;
  kind: "hero" | "event";
}

export const SEASON_7_START_ISO = "2026-09-09T00:00:00Z";

export const SEASON_7_MILESTONES: SeasonSevenMilestone[] = [
  {
    date: "SEP 09",
    title: "Super Gogeta",
    detail: "Season 7 opens with the first of three announced new heroes.",
    kind: "hero",
  },
  {
    date: "SEP 29",
    title: "New Hero",
    detail: "The second Season 7 fighter remains officially unannounced.",
    kind: "hero",
  },
  {
    date: "OCT 13",
    title: "New Hero",
    detail: "The third Season 7 fighter remains officially unannounced.",
    kind: "hero",
  },
];

export const SEASON_7_CAMPAIGNS = [
  "5 free Capsules a day",
  "Anniversary Celebration G-Capsule",
  "New Hero Special Sets",
  "Anniversary Celebration Special Pass Vol. 1–3",
  "Anniversary Login Bonus",
  "Legendary Revival Capsule Vol. 1–4",
  "GEKISHIN Cup #4 and #5",
  "SP Cell Jr. GEKISHIN Rules campaign",
  "Lucky Boxes in Battle",
  "Halloween Event",
  "Countdown Special Pass",
  "Weekly patches",
  "Hero Mission ×2 campaign",
  "Triple Hero Memory campaign",
  "Divine Draw Revival campaign",
] as const;
