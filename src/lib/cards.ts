import type { CardDefinition } from "../types";

const card = (
  id: string,
  name: string,
  effect: string,
  family: CardDefinition["family"],
  slot: CardDefinition["slot"],
): CardDefinition => ({
  id,
  name,
  effect,
  family,
  slot,
  portrait: `/assets/cards/${id}.png`,
});

// Concise S6 summaries based on the DBGS Builds card-effect catalog.
export const CARDS: CardDefinition[] = [
  card("1-1-rossa", "Lightning Swift", "After a Vanishing Step, attacks landed within 2 seconds deal extra energy damage. Activates once every 6 seconds.", "offense", 1),
  card("1-2-rossa", "Super Snowball", "Hero KOs and assists stack attack power up to 8 times. All accumulated stacks are lost when you are KO'd.", "offense", 1),
  card("1-1-verde", "Build Up", "Hero KOs or assists—and every five enemy-NPC takedowns—add a defense stack, up to 10 stacks.", "defense", 1),
  card("1-2-verde", "Too Easy!", "Dropping to half health or lower grants temporary extra HP for 2 seconds. Activates once every 30 seconds.", "defense", 1),
  card("1-1-blu", "Strategic Escape", "Increases movement speed while your back is turned toward a nearby enemy hero.", "utility", 1),
  card("1-2-blu", "Gekishin High", "Landing a Gekishin Burst shortens the cooldown of the skill used to trigger it.", "utility", 1),

  card("2-1-rossa", "Giant Slayer", "Hitting a hero at 80% HP or higher grants lasting bonus damage against that target, scaled by their maximum HP.", "offense", 2),
  card("2-2-rossa", "Prepare to Die!", "Hitting a hero at half health or lower grants lasting bonus damage against them, with a stronger effect after they remain alive briefly.", "offense", 2),
  card("2-1-verde", "Steel Skin", "Reduces incoming damage by a fixed amount for each hit received from an enemy hero.", "defense", 2),
  card("2-2-verde", "Solid Barrier", "After 15 seconds without hero damage, gain a barrier that heavily reduces hero damage before breaking shortly after it is struck.", "defense", 2),
  card("2-1-blu", "Art of Decoy", "When an enemy hero obstructs you, gain movement speed and faster Vanishing Step recovery for 6 seconds. Ten-second cooldown.", "utility", 2),
  card("2-2-blu", "Epic Hunter", "Damaging a boss below half health boosts your boss damage for 4 seconds; the effect ends when the eligible boss is defeated.", "utility", 2),

  card("3-1-rossa", "Wicked Warrior", "Three consecutive Rush Attacks against one hero temporarily boost Rush Attack damage.", "offense", 3),
  card("3-2-rossa", "Pursuer", "Landing two skills on a hero within 2 seconds adds energy damage and boosts movement speed toward that target for 7.5 seconds.", "offense", 3),
  card("3-1-verde", "Defense Step", "A Vanishing Step grants 4 seconds of fading damage reduction, with greater protection against Super Attacks. Four-second cooldown.", "defense", 3),
  card("3-2-verde", "Guardian Angel", "Redirects part of a nearby ally's incoming hero damage to you. Your redirected damage is reduced when more allies are nearby.", "defense", 3),
  card("3-1-blu", "Backstab", "Landing a non-Super skill within 3 seconds of being discovered greatly shortens that skill's cooldown.", "utility", 3),
  card("3-2-blu", "Limit-Breaking Jump", "Allows one extra Vanishing Step while it is already cooling down. Activates once every 6 seconds.", "utility", 3),
];

export function getCard(cardId: string): CardDefinition | null {
  return CARDS.find((entry) => entry.id === cardId) ?? null;
}

export function getCardsForSlot(slot: CardDefinition["slot"]): CardDefinition[] {
  return CARDS.filter((entry) => entry.slot === slot);
}
