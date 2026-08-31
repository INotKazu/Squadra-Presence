export const SMITE2_SOURCE_IDS = ["smitebrain", "smitesource"] as const;
export type Smite2SourceId = (typeof SMITE2_SOURCE_IDS)[number];

export type Smite2SourceCapability =
  | "ranked-builds"
  | "community-builds"
  | "player-tracker"
  | "match-history"
  | "god-catalog"
  | "item-catalog"
  | "source-assets";

export interface Smite2SourceDefinition {
  id: Smite2SourceId;
  label: string;
  baseUrl: string;
  hostnameRoot: string;
  capabilities: readonly Smite2SourceCapability[];
}

export const SMITE2_SOURCES = {
  smitebrain: {
    id: "smitebrain",
    label: "SmiteBrain",
    baseUrl: "https://smitebrain.com",
    hostnameRoot: "smitebrain.com",
    capabilities: ["ranked-builds", "god-catalog", "item-catalog", "source-assets"],
  },
  smitesource: {
    id: "smitesource",
    label: "SmiteSource",
    baseUrl: "https://smitesource.com",
    hostnameRoot: "smitesource.com",
    capabilities: [
      "community-builds",
      "player-tracker",
      "match-history",
      "god-catalog",
      "item-catalog",
      "source-assets",
    ],
  },
} as const satisfies Record<Smite2SourceId, Smite2SourceDefinition>;

function sourceForHostname(hostname: string): Smite2SourceDefinition | null {
  const normalized = hostname.toLowerCase().replace(/\.$/u, "");
  return Object.values(SMITE2_SOURCES).find((source) => (
    normalized === source.hostnameRoot || normalized.endsWith(`.${source.hostnameRoot}`)
  )) ?? null;
}

export function sourceForUrl(value: string): Smite2SourceDefinition | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return sourceForHostname(url.hostname);
  } catch {
    return null;
  }
}

export function isApprovedSmite2SourceUrl(value: string): boolean {
  return sourceForUrl(value) !== null;
}

export function assertApprovedSmite2SourceUrl(value: string): string {
  if (!isApprovedSmite2SourceUrl(value)) {
    throw new Error("Only HTTPS SmiteBrain and SmiteSource URLs are approved for SMITE 2 data.");
  }
  return value;
}

export function toSmite2Slug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[’']/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  if (!slug || slug.length > 80) throw new Error("Enter a valid SMITE 2 god name or slug.");
  return slug;
}

export function smiteBrainBuildsUrl(): string {
  return `${SMITE2_SOURCES.smitebrain.baseUrl}/builds`;
}

export function smiteBrainGodBuildsUrl(god: string): string {
  return `${SMITE2_SOURCES.smitebrain.baseUrl}/gods/${toSmite2Slug(god)}/builds`;
}

export function smiteSourceBuildsUrl(god?: string): string {
  const url = new URL("/builds", SMITE2_SOURCES.smitesource.baseUrl);
  if (god) url.searchParams.set("god", toSmite2Slug(god));
  return url.toString();
}

export function smiteSourceTrackerUrl(): string {
  return `${SMITE2_SOURCES.smitesource.baseUrl}/tracker`;
}

export function smiteSourceGodsUrl(): string {
  return `${SMITE2_SOURCES.smitesource.baseUrl}/gods`;
}

export function smiteSourceItemsUrl(): string {
  return `${SMITE2_SOURCES.smitesource.baseUrl}/items`;
}
