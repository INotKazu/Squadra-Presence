import type { CharacterDefinition, RecommendedBuild } from "../types";
import { CHARACTERS } from "./characters";

const HERO_ID_BY_ASSET_KEY: Record<string, string> = {
  character_ssj_goku: "0001",
  character_ssj_vegeta: "0002",
  character_krillin: "0003",
  character_ssj_trunks_teen: "0004",
  character_piccolo: "0005",
  character_android_18: "0006",
  character_majin_buu_good: "0007",
  character_zamasu: "0008",
  character_gohan_kid: "0009",
  character_baby_young_body: "0010",
  character_frieza_first_form: "0011",
  character_dabura: "0012",
  character_cooler_final_form: "0013",
  character_super_uub: "0014",
  character_bojack_full_power: "0015",
  character_ssj2_caulifla: "0016",
  character_goku_mini: "0017",
  character_cell_perfect_form: "0018",
  character_android_17: "0019",
  character_hit: "0020",
  character_kale_berserk: "0021",
  character_gamma_1_2: "0022",
  character_ssj3_goku: "0023",
  character_ssj_gotenks: "0024",
  character_toppo_god: "0025",
  character_ssj4_vegeta: "0026",
  character_ultimate_gohan: "0027",
  character_broly: "0028",
  character_super_vegito: "0029",
  character_bardock: "0030",
  character_kefla: "0031",
  character_ssg_goku: "0032",
  character_ssg_vegeta: "0033",
  character_majin_buu_pure: "0034",
  character_frieza_fourth_form: "0035",
  character_goku_youth: "0036",
  character_bulma_youth: "0037",
  character_beerus: "0038",
  character_goku_black: "0039",
  character_jiren_full_power: "0040",
};

export const RECOMMENDED_BUILDS: Record<string, RecommendedBuild> = {
  "0001": { heroId: "0001", cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-goku-ssj1/" },
  "0002": { heroId: "0002", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "hire_dragon", sourceUrl: "https://dbgsbuilds.com/build/build-vegeta-ssj1/" },
  "0003": { heroId: "0003", cardIds: ["1-1-verde", "2-1-blu", "3-1-verde"], helperId: "shu", sourceUrl: "https://dbgsbuilds.com/build/build-krilin/" },
  "0004": { heroId: "0004", cardIds: ["1-2-rossa", "2-2-verde", "3-1-blu"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-trunks-ssj1-teen/" },
  "0005": { heroId: "0005", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-piccolo/" },
  "0006": { heroId: "0006", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-android-18/" },
  "0007": { heroId: "0007", cardIds: ["1-1-verde", "2-1-verde", "3-2-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-majin-buu-good/" },
  "0008": { heroId: "0008", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "hire_dragon", sourceUrl: "https://dbgsbuilds.com/build/build-zamasu/" },
  "0009": { heroId: "0009", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-son-gohan-kid/" },
  "0010": { heroId: "0010", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "hire_dragon", sourceUrl: "https://dbgsbuilds.com/build/build-baby-young-body/" },
  "0011": { heroId: "0011", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-frieza-first-form/" },
  "0012": { heroId: "0012", cardIds: ["1-1-verde", "2-2-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/dabura/" },
  "0013": { heroId: "0013", cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"], helperId: "hire_dragon", sourceUrl: "https://dbgsbuilds.com/build/build-cooler-final-form/" },
  "0014": { heroId: "0014", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-super-uub/" },
  "0015": { heroId: "0015", cardIds: ["1-2-rossa", "2-1-rossa", "3-2-blu"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-full-power-bojack/" },
  "0016": { heroId: "0016", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "dende", sourceUrl: "https://dbgsbuilds.com/build/build-caulifla-ssj2/" },
  "0017": { heroId: "0017", cardIds: ["1-2-rossa", "2-2-verde", "3-1-blu"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-son-goku-mini/" },
  "0018": { heroId: "0018", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "dende", sourceUrl: "https://dbgsbuilds.com/build/build-cell-perfect-form/" },
  "0019": { heroId: "0019", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-android-17/" },
  "0020": { heroId: "0020", cardIds: ["1-2-rossa", "2-2-verde", "3-1-blu"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-hit/" },
  "0021": { heroId: "0021", cardIds: ["1-2-rossa", "2-1-rossa", "3-2-blu"], helperId: "elder_supreme_kai", sourceUrl: "https://dbgsbuilds.com/build/build-kale-ssj-berserk/" },
  "0022": { heroId: "0022", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-gamma-1-gamma-2/" },
  "0023": { heroId: "0023", cardIds: ["1-1-verde", "2-1-rossa", "3-2-blu"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-son-goku-ssj3/" },
  "0024": { heroId: "0024", cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-gotenks-ssj1/" },
  "0025": { heroId: "0025", cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-toppo-god-of-destruction/" },
  "0026": { heroId: "0026", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "dende", sourceUrl: "https://dbgsbuilds.com/build/build-vegeta-ssj4/" },
  "0027": { heroId: "0027", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/build-gohan-ultimate/" },
  "0028": { heroId: "0028", cardIds: ["1-1-verde", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-broly/" },
  "0029": { heroId: "0029", cardIds: ["1-2-rossa", "2-1-rossa", "3-1-verde"], helperId: "world_king", sourceUrl: "https://dbgsbuilds.com/build/build-super-vegito/" },
  "0030": { heroId: "0030", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "dende", sourceUrl: "https://dbgsbuilds.com/build/build-super-saiyan-bardock/" },
  "0031": { heroId: "0031", cardIds: ["1-1-rossa", "2-1-rossa", "3-2-blu"], helperId: "nail", sourceUrl: "https://dbgsbuilds.com/build/build-super-saiyan-2-kefla/" },
  "0032": { heroId: "0032", cardIds: ["1-2-rossa", "2-1-rossa", "3-2-blu"], helperId: "elder_supreme_kai", sourceUrl: "https://dbgsbuilds.com/build/secondary-build/" },
  "0033": { heroId: "0033", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "cabba", sourceUrl: "https://dbgsbuilds.com/build/secondary-build-2/" },
  "0034": { heroId: "0034", cardIds: ["1-1-verde", "2-1-verde", "3-1-verde"], helperId: "bubbles", sourceUrl: "https://dbgsbuilds.com/build/build-majin-buu-pure/" },
  "0035": { heroId: "0035", cardIds: ["1-1-blu", "2-2-verde", "3-2-blu"], helperId: "farmer", sourceUrl: "https://dbgsbuilds.com/build/build-frieza-fourth-form/" },
  "0036": { heroId: "0036", cardIds: ["1-1-rossa", "2-1-blu", "3-1-verde"], helperId: "nail", sourceUrl: "https://dbgsbuilds.com/build/build-son-goku-youth/" },
  "0037": { heroId: "0037", cardIds: ["1-1-verde", "2-1-blu", "3-1-verde"], helperId: "cabba", sourceUrl: "https://dbgsbuilds.com/build/bulma-youth/" },
  "0038": { heroId: "0038", cardIds: ["1-2-rossa", "2-2-rossa", "3-2-rossa"], helperId: "elder_supreme_kai", sourceUrl: "https://dbgsbuilds.com/build/beerus/" },
  "0039": { heroId: "0039", cardIds: ["1-1-verde", "2-1-blu", "3-1-verde"], helperId: "karin", sourceUrl: "https://dbgsbuilds.com/build/goku-black/" },
  "0040": { heroId: "0040", cardIds: ["1-1-verde", "2-1-verde", "3-1-rossa"], helperId: "dende", sourceUrl: "https://dbgsbuilds.com/build/jiren-full-power/" },
};

export function getHeroReferenceId(character: CharacterDefinition): string | null {
  return character.assetKey ? HERO_ID_BY_ASSET_KEY[character.assetKey] ?? null : null;
}

export function getRecommendedBuild(character: CharacterDefinition): RecommendedBuild | null {
  const heroId = getHeroReferenceId(character);
  return heroId ? RECOMMENDED_BUILDS[heroId] ?? null : null;
}

export function getCharacterByHeroId(heroId: string): CharacterDefinition | null {
  const assetKey = Object.entries(HERO_ID_BY_ASSET_KEY).find(([, id]) => id === heroId)?.[0];
  return assetKey ? CHARACTERS.find((character) => character.assetKey === assetKey) ?? null : null;
}
