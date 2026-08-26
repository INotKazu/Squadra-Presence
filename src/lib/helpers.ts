import type { HelperDefinition, RoleId } from "../types";

const portrait = (assetKey: string) => `/assets/helpers/${assetKey}.png`;

export const HELPERS: HelperDefinition[] = [
  {
    id: "world_king", name: "World King", label: "World King", role: "damage",
    effect: "Raises all of your attacks while you are in range.",
    assetKey: "helper_world_king", portrait: portrait("helper_world_king"),
  },
  {
    id: "mr_satan", name: "Mr. Satan", label: "Mr. Satan", role: "damage",
    effect: "Raises all of your attacks while you are in range.",
    assetKey: "helper_mr_satan", portrait: portrait("helper_mr_satan"),
  },
  {
    id: "nail", name: "Nail", label: "Nail", role: "damage",
    effect: "Follows you and launches a follow-up attack after your Rush Attack hits.",
    assetKey: "helper_nail", portrait: portrait("helper_nail"),
  },
  {
    id: "botamo", name: "Botamo", label: "Botamo", role: "damage",
    effect: "Pushes away the nearest enemy hero in range.",
    assetKey: "helper_botamo", portrait: portrait("helper_botamo"),
  },
  {
    id: "major_metallic", name: "Major Metallic", label: "Major Metallic", role: "damage",
    effect: "Destroys a portion of the stage in the chosen direction.",
    assetKey: "helper_major_metallic", portrait: portrait("helper_major_metallic"),
  },
  {
    id: "elder_supreme_kai", name: "Elder Supreme Kai", label: "Elder Supreme Kai", role: "damage",
    effect: "Raises your Skill Efficiency while you are in range.",
    assetKey: "helper_elder_supreme_kai", portrait: portrait("helper_elder_supreme_kai"),
  },
  {
    id: "cabba", name: "Cabba", label: "Cabba", role: "tank",
    effect: "Raises all of your defenses while you are in range.",
    assetKey: "helper_cabba", portrait: portrait("helper_cabba"),
  },
  {
    id: "hyper_mega_rildo", name: "Hyper Mega Rildo", label: "Hyper Mega Rildo", role: "tank",
    effect: "Applies Wrath to the nearest enemy hero in range.",
    assetKey: "helper_hyper_mega_rildo", portrait: portrait("helper_hyper_mega_rildo"),
  },
  {
    id: "hire_dragon", name: "Hire Dragon", label: "Hire Dragon", role: "tank",
    effect: "Quickly moves in a chosen direction, stopping at a wall or after taking an attack.",
    assetKey: "helper_hire_dragon", portrait: portrait("helper_hire_dragon"),
  },
  {
    id: "tao_pai_pai", name: "Tao Pai Pai", label: "Tao Pai Pai", role: "tank",
    effect: "Quickly moves in a chosen direction, stopping at a wall or after taking an attack.",
    assetKey: "helper_tao_pai_pai", portrait: portrait("helper_tao_pai_pai"),
  },
  {
    id: "spopovich", name: "Spopovich", label: "Spopovich", role: "tank",
    effect: "Pulls the nearest enemy hero in range toward you.",
    assetKey: "helper_spopovich", portrait: portrait("helper_spopovich"),
  },
  {
    id: "dende", name: "Dende", label: "Dende", role: "tank",
    effect: "Continuously restores armor and improves recovery while you are in range.",
    assetKey: "helper_dende", portrait: portrait("helper_dende"),
  },
  {
    id: "shu", name: "Shu", label: "Shu", role: "technical",
    effect: "Applies Marked to enemy heroes in range.",
    assetKey: "helper_shu", portrait: portrait("helper_shu"),
  },
  {
    id: "bubbles", name: "Bubbles", label: "Bubbles", role: "technical",
    effect: "Raises movement speed and Step Efficiency for you and allied heroes in range.",
    assetKey: "helper_bubbles", portrait: portrait("helper_bubbles"),
  },
  {
    id: "bulla_gt", name: "Bulla (GT)", label: "Bulla (GT)", role: "technical",
    effect: "Raises movement speed and Step Efficiency for you and allied heroes in range.",
    assetKey: "helper_bulla_gt", portrait: portrait("helper_bulla_gt"),
  },
  {
    id: "farmer", name: "Farmer", label: "Farmer", role: "technical",
    effect: "Attacks the nearest hero and lowers their defense and movement speed.",
    assetKey: "helper_farmer", portrait: portrait("helper_farmer"),
  },
  {
    id: "invisible_man", name: "Invisible Man", label: "Invisible Man", role: "technical",
    effect: "Hides you and allied heroes from discovery while the effect remains active.",
    assetKey: "helper_invisible_man", portrait: portrait("helper_invisible_man"),
  },
  {
    id: "karin", name: "Karin", label: "Karin", role: "technical",
    effect: "Draws allies toward the Helper and raises movement speed, with a stronger effect on slower targets.",
    assetKey: "helper_karin", portrait: portrait("helper_karin"),
  },
];

export function getHelper(helperId?: string | null): HelperDefinition | null {
  if (!helperId) return null;
  return HELPERS.find((helper) => helper.id === helperId) ?? null;
}

export function getHelpersForRole(role: RoleId): HelperDefinition[] {
  return HELPERS.filter((helper) => helper.role === role);
}
