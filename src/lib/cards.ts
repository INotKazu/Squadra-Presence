import type { CardDefinition } from "../types";

const card = (
  id: string,
  name: string,
  effect: string,
  family: CardDefinition["family"],
  slot: CardDefinition["slot"],
  options: {
    portrait?: string;
    trigger?: string;
    introducedSeason?: string;
    retiredAfterSeason?: string;
  } = {},
): CardDefinition => ({
  id,
  name,
  effect,
  trigger: options.trigger ?? null,
  family,
  slot,
  portrait: options.portrait ?? `/assets/cards/${id}.png`,
  introducedSeason: options.introducedSeason ?? "6",
  retiredAfterSeason: options.retiredAfterSeason ?? null,
});

const retiredS6 = { retiredAfterSeason: "6" } as const;
const season7 = (portrait: string, trigger: string) => ({
  introducedSeason: "7",
  portrait: `/assets/cards/${portrait}`,
  trigger,
});

// The complete Season 6 catalog remains readable so an update never destroys
// saved builds or portable share codes. Removed cards are excluded from the
// Season 7 editor by getCardsForSlot().
const SEASON_6_CARDS: CardDefinition[] = [
  card("1-1-rossa", "Lightning Swift", "After a Vanishing Step, attacks landed within 2 seconds deal extra energy damage. Activates once every 6 seconds.", "offense", 1),
  card("1-2-rossa", "Super Snowball", "Hero KOs and assists stack attack power up to 8 times. All accumulated stacks are lost when you are KO'd.", "offense", 1),
  card("1-1-verde", "Build Up", "Hero KOs or assists—and every five enemy-NPC takedowns—add a defense stack, up to 10 stacks.", "defense", 1),
  card("1-2-verde", "Too Easy!", "Dropping to half health or lower grants temporary extra HP for 2 seconds. Activates once every 30 seconds.", "defense", 1, retiredS6),
  card("1-1-blu", "Strategic Escape", "Increases movement speed while your back is turned toward a nearby enemy hero.", "utility", 1, retiredS6),
  card("1-2-blu", "Gekishin High", "Landing a Gekishin Burst shortens the cooldown of the skill used to trigger it.", "utility", 1, retiredS6),

  card("2-1-rossa", "Giant Slayer", "Hitting a hero at 80% HP or higher grants lasting bonus damage against that target, scaled by their maximum HP.", "offense", 2),
  card("2-2-rossa", "Prepare to Die!", "Hitting a hero at half health or lower grants lasting bonus damage against them, with a stronger effect after they remain alive briefly.", "offense", 2, retiredS6),
  card("2-1-verde", "Steel Skin", "Reduces incoming damage by a fixed amount for each hit received from an enemy hero.", "defense", 2, retiredS6),
  card("2-2-verde", "Solid Barrier", "After 15 seconds without hero damage, gain a barrier that heavily reduces hero damage before breaking shortly after it is struck.", "defense", 2, retiredS6),
  card("2-1-blu", "Art of Decoy", "When an enemy hero obstructs you, gain movement speed and faster Vanishing Step recovery for 6 seconds. Ten-second cooldown.", "utility", 2, retiredS6),
  card("2-2-blu", "Epic Hunter", "Damaging a boss below half health boosts your boss damage for 4 seconds; the effect ends when the eligible boss is defeated.", "utility", 2, retiredS6),

  card("3-1-rossa", "Wicked Warrior", "Three consecutive Rush Attacks against one hero temporarily boost Rush Attack damage.", "offense", 3, retiredS6),
  card("3-2-rossa", "Pursuer", "Landing two skills on a hero within 2 seconds adds energy damage and boosts movement speed toward that target for 7.5 seconds.", "offense", 3, retiredS6),
  card("3-1-verde", "Defense Step", "A Vanishing Step grants 4 seconds of fading damage reduction, with greater protection against Super Attacks. Four-second cooldown.", "defense", 3),
  card("3-2-verde", "Guardian Angel", "Redirects part of a nearby ally's incoming hero damage to you. Your redirected damage is reduced when more allies are nearby.", "defense", 3, retiredS6),
  card("3-1-blu", "Backstab", "Landing a non-Super skill within 3 seconds of being discovered greatly shortens that skill's cooldown.", "utility", 3, retiredS6),
  card("3-2-blu", "Limit-Breaking Jump", "Allows one extra Vanishing Step while it is already cooling down. Activates once every 6 seconds.", "utility", 3),
];

// Wording follows the English Season 7 reveal. The announcement states that
// visuals and content are still subject to change, so these stay easy to amend.
export const SEASON_7_NEW_CARDS: CardDefinition[] = [
  card("s7-1-green-angelic-blessing", "Angelic Blessing", "Increases recovery.", "defense", 1, season7("s7-angelic-blessing.svg", "Upon recovering in an allied God of Destruction area")),
  card("s7-1-blue-rocket-booster", "Rocket Booster", "Shortens the time needed to enter high-speed movement.", "utility", 1, season7("s7-rocket-booster.svg", "While moving")),
  card("s7-1-blue-high-intensity", "High Intensity", "Reduces charging time for GEKISHIN Burst, excluding Max GEKISHIN Burst.", "utility", 1, season7("s7-high-intensity.svg", "Every KO or assist on an enemy hero")),

  card("s7-2-red-gutsy", "Gutsy", "Reduces maximum total HP and boosts the power of all attacks.", "offense", 2, season7("s7-gutsy.svg", "Always active")),
  card("s7-2-green-deep-grudge", "Deep Grudge", "Gain extra HP.", "defense", 2, season7("s7-deep-grudge.svg", "When hit by an attack from an enemy hero or companion")),
  card("s7-2-green-adrenaline-power", "Adrenaline Power", "Reduces the initial damage on hit and applies the reduced amount of damage over time.", "defense", 2, season7("s7-adrenaline-power.svg", "When hit by an attack")),
  card("s7-2-blue-ninja-concealment-arts", "Ninja Concealment Arts", "Generates smoke around you.", "utility", 2, season7("s7-ninja-concealment-arts.svg", "When close to a boss")),
  card("s7-2-blue-heal-block", "Heal Block", "The target enemy hero loses extra HP and is prevented from recovering total HP (unless transformed) or gaining extra HP.", "utility", 2, season7("s7-heal-block.svg", "When a Skill hits an enemy hero whose combined Base HP and Armor is 30% or lower")),

  card("s7-3-red-super-charge", "Super Charge", "Reduces Super Attack cooldowns.", "offense", 3, season7("s7-super-charge.svg", "Every KO on an enemy hero")),
  card("s7-3-red-stealth-attack", "Stealth Attack", "For a set period, enemies cannot discover you and enemy heroes take extra damage when hit with Skills.", "offense", 3, season7("s7-stealth-attack.svg", "Every KO or assist on an enemy hero")),
  card("s7-3-green-turtle-shell", "Turtle Shell", "Extends the Vanishing Step cooldown and boosts maximum total HP.", "defense", 3, season7("s7-turtle-shell.svg", "Always active")),
  card("s7-3-blue-full-throttle", "Full Throttle", "Boosts maximum movement speed during high-speed movement.", "utility", 3, season7("s7-full-throttle.svg", "Always active")),
];

export const CARDS: CardDefinition[] = [...SEASON_6_CARDS, ...SEASON_7_NEW_CARDS];

export function getCard(cardId: string): CardDefinition | null {
  return CARDS.find((entry) => entry.id === cardId) ?? null;
}

export function isCurrentCard(card: CardDefinition): boolean {
  return card.retiredAfterSeason === null;
}

export function isCurrentBuild(cardIds: string[]): boolean {
  return cardIds.length === 3 && cardIds.every((cardId) => {
    const current = getCard(cardId);
    return current ? isCurrentCard(current) : false;
  });
}

export function getCardsForSlot(slot: CardDefinition["slot"], includeRetired = false): CardDefinition[] {
  return CARDS.filter((entry) => entry.slot === slot && (includeRetired || isCurrentCard(entry)));
}
