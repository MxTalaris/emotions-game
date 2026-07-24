import { getCardByAlias } from '../data/cards';
import {
  CardAlias,
  CardSuit,
  EventOutput,
  GameEventInstance,
  SuitEnergy,
  SuitQuantity,
} from '../types';
import { resolveModifiedCardEnergy } from './resolveModifiedCardEnergy';

function normalizeOutputEmotions(
  outputEmotions: CardAlias | CardAlias[]
): CardAlias[] {
  return Array.isArray(outputEmotions) ? outputEmotions : [outputEmotions];
}

function countBySuit(aliases: CardAlias[]): Map<CardSuit, number> {
  const counts = new Map<CardSuit, number>();

  for (const alias of aliases) {
    const card = getCardByAlias(alias);
    if (!card) continue;
    counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  }

  return counts;
}

function energyBySuit(
  aliases: CardAlias[],
  modifiers: GameEventInstance['modifiers']
): Map<CardSuit, number> {
  const totals = new Map<CardSuit, number>();

  for (const alias of aliases) {
    const card = getCardByAlias(alias);
    if (!card) continue;
    const energy = resolveModifiedCardEnergy(card, modifiers);
    totals.set(card.suit, (totals.get(card.suit) ?? 0) + energy);
  }

  return totals;
}

function matchesSuitQuantities(
  aliases: CardAlias[],
  requirements: SuitQuantity[]
): boolean {
  if (requirements.length === 0) return false;
  const counts = countBySuit(aliases);
  return requirements.every(
    (requirement) => (counts.get(requirement.suitId) ?? 0) >= requirement.quantity
  );
}

function matchesSuitEnergies(
  event: GameEventInstance,
  requirements: SuitEnergy[]
): boolean {
  if (requirements.length === 0) return false;
  const totals = energyBySuit(event.placedCardAliases, event.modifiers);
  return requirements.every(
    (requirement) => (totals.get(requirement.suitId) ?? 0) >= requirement.total
  );
}

function matchesCardEmotions(
  aliases: CardAlias[],
  required: CardAlias[]
): boolean {
  if (required.length === 0) return false;
  return required.some((alias) => aliases.includes(alias));
}

export function matchesEventOutputInput(
  event: GameEventInstance,
  output: EventOutput
): boolean {
  const { input } = output;

  switch (input.type) {
    case 'default':
      return event.cardsPlacedThisTurn > 0;
    case 'suitQuantities':
      return matchesSuitQuantities(event.placedCardAliases, input.suitQuantities);
    case 'suitEnergies':
      return matchesSuitEnergies(event, input.suitEnergies);
    case 'cardEmotions':
      return matchesCardEmotions(event.placedCardAliases, input.cardEmotions);
    default:
      return false;
  }
}

/**
 * Picks which outputs fire for an event, then flattens their emotions.
 * - No exclusives among valid → all valid fire
 * - Any exclusive valid → only exclusives; highest priority exclusive wins alone
 */
export function resolveEventOutputEmotions(
  event: GameEventInstance
): CardAlias[] {
  const outputs = event.outputs ?? [];
  const valid = outputs.filter((output) => matchesEventOutputInput(event, output));
  if (valid.length === 0) return [];

  const exclusives = valid.filter((output) => output.exclusive);
  const selected =
    exclusives.length > 0
      ? [
          exclusives.reduce((best, output) =>
            output.priority > best.priority ? output : best
          ),
        ]
      : valid;

  return selected.flatMap((output) =>
    normalizeOutputEmotions(output.outputEmotions)
  );
}
