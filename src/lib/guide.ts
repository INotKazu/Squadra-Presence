import { getCard } from "./cards";
import { HELPERS } from "./helpers";
import type { ExpandedBuildGuide, GuideChoice, SkillOrderRow } from "../types";

const GUIDE_CACHE_PREFIX = "squadra-presence.build-guide-cache.v1.";
const GUIDE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cardIdFromImage(image: Element): string | null {
  const source = image.getAttribute("src") ?? "";
  const match = source.match(/([123]-[12]-(?:rossa|verde|blu))\.png/i);
  const cardId = match?.[1]?.toLowerCase() ?? null;
  return cardId && getCard(cardId) ? cardId : null;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/^\d+-/, "").replace(/helper[_-]/g, "").replace(/[^a-z0-9]+/g, "");
}

function helperIdFromImage(image: Element): string | null {
  const source = decodeURIComponent(image.getAttribute("src") ?? "");
  const basename = source.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
  const normalized = normalizeName(basename);
  return HELPERS.find((helper) => {
    const candidates = [helper.id, helper.name, helper.label, helper.assetKey ?? ""].map(normalizeName);
    return candidates.some((candidate) => candidate && (normalized === candidate || normalized.endsWith(candidate)));
  })?.id ?? null;
}

function heroIdFromElement(element: Element): string | null {
  const image = element.matches("img") ? element : element.querySelector("img");
  const source = image?.getAttribute("src") ?? "";
  return source.match(/\/Char\/(\d{4})\//i)?.[1] ?? null;
}

function collectSituationalChoices(root: Element, kind: "card" | "helper"): GuideChoice[] {
  const headingPattern = kind === "card" ? /situational.*card|card.*situational/i : /situational.*helper|helper.*situational/i;
  const result: GuideChoice[] = [];
  for (const heading of Array.from(root.querySelectorAll("h2, h3, h4")).filter((entry) => headingPattern.test(cleanText(entry.textContent)))) {
    let cursor = heading.nextElementSibling;
    let current: GuideChoice | null = null;
    while (cursor && !/^H[234]$/.test(cursor.tagName)) {
      const images = cursor.matches("img") ? [cursor] : Array.from(cursor.querySelectorAll("img"));
      for (const image of images) {
        const id = kind === "card" ? cardIdFromImage(image) : helperIdFromImage(image);
        if (id && !result.some((choice) => choice.id === id)) {
          current = { id, note: null };
          result.push(current);
        }
      }
      if (cursor.tagName === "P" && current) {
        const note = cleanText(cursor.textContent);
        if (note && !current.note) current.note = note.slice(0, 600);
      }
      cursor = cursor.nextElementSibling;
    }
  }
  return result;
}

function collectExplanation(root: Element): string | null {
  const paragraphs = Array.from(root.querySelectorAll("p"));
  const labelIndex = paragraphs.findIndex((paragraph) => cleanText(paragraph.textContent).replace(/build explanation/ig, "").trim().length === 0);
  if (labelIndex >= 0) {
    for (const paragraph of paragraphs.slice(labelIndex + 1)) {
      const text = cleanText(paragraph.textContent);
      if (text) return text.slice(0, 1800);
    }
  }
  const fallback = paragraphs.map((paragraph) => cleanText(paragraph.textContent)).find((text) => /^with this build\b/i.test(text));
  return fallback?.slice(0, 1800) ?? null;
}

function collectSkillOrder(root: Element): SkillOrderRow[] {
  const section = root.querySelector("#skill-upgrade-order");
  if (!section) return [];
  return Array.from(section.querySelectorAll(".dbgs-skill-order__row")).map((row) => {
    const skill = cleanText(row.querySelector(".skills-ui__label")?.textContent) || "Skill";
    const cells = Array.from(row.querySelectorAll(".dbgs-skill-order__cell"));
    const levels = cells.flatMap((cell, index) => {
      if (!cell.classList.contains("is-on")) return [];
      const explicit = Number(cleanText(cell.textContent));
      return [Number.isFinite(explicit) && explicit > 0 ? explicit : index + 2];
    });
    return { skill, levels };
  }).filter((row) => row.levels.length > 0);
}

function sectionAfter(root: Element, id: string): Element | null {
  let cursor = root.querySelector(`#${id}`)?.nextElementSibling ?? null;
  while (cursor && /^H[1-6]$/.test(cursor.tagName)) cursor = cursor.nextElementSibling;
  return cursor;
}

function uniqueHeroIds(elements: Element[]): string[] {
  return [...new Set(elements.map(heroIdFromElement).filter((value): value is string => Boolean(value)))];
}

export function parseBuildGuideHtml(sourceUrl: string, html: string): ExpandedBuildGuide {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const root = documentNode.querySelector("main article") ?? documentNode.body;
  const comps = sectionAfter(root, "recommended-comps");
  const matchups = sectionAfter(root, "matchups");
  return {
    sourceUrl,
    explanation: collectExplanation(root),
    situationalCards: collectSituationalChoices(root, "card"),
    situationalHelpers: collectSituationalChoices(root, "helper"),
    skillOrder: collectSkillOrder(root),
    recommendedCompHeroIds: comps ? uniqueHeroIds(Array.from(comps.querySelectorAll(".free-rotation__item, a"))) : [],
    strongAgainstHeroIds: matchups ? uniqueHeroIds(Array.from(matchups.querySelectorAll(".free-rotation__item.is-strong"))) : [],
    weakAgainstHeroIds: matchups ? uniqueHeroIds(Array.from(matchups.querySelectorAll(".free-rotation__item.is-weak"))) : [],
  };
}

function isExpandedGuide(value: unknown): value is ExpandedBuildGuide {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExpandedBuildGuide>;
  return typeof candidate.sourceUrl === "string"
    && (candidate.explanation === null || typeof candidate.explanation === "string")
    && Array.isArray(candidate.situationalCards)
    && Array.isArray(candidate.situationalHelpers)
    && Array.isArray(candidate.skillOrder)
    && Array.isArray(candidate.recommendedCompHeroIds)
    && Array.isArray(candidate.strongAgainstHeroIds)
    && Array.isArray(candidate.weakAgainstHeroIds);
}

export function loadCachedBuildGuide(heroId: string): ExpandedBuildGuide | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(`${GUIDE_CACHE_PREFIX}${heroId}`);
    if (!saved) return null;
    const record = JSON.parse(saved) as { fetchedAt?: number; guide?: unknown };
    return record.fetchedAt && Date.now() - record.fetchedAt <= GUIDE_CACHE_MAX_AGE && isExpandedGuide(record.guide) ? record.guide : null;
  } catch {
    return null;
  }
}

export function cacheBuildGuide(heroId: string, guide: ExpandedBuildGuide): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`${GUIDE_CACHE_PREFIX}${heroId}`, JSON.stringify({ fetchedAt: Date.now(), guide }));
  }
}
