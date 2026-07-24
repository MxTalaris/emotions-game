import { getCardByAlias } from '../data/cards';
import {
  CardAlias,
  CardSuit,
  DealBreaker,
  GameEventInstance,
  SuitEnergy,
  SuitQuantity,
} from '../types';
import { resolveModifiedCardEnergy } from './resolveModifiedCardEnergy';

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
  event: GameEventInstance
): Map<CardSuit, number> {
  const totals = new Map<CardSuit, number>();

  for (const alias of event.placedCardAliases) {
    const card = getCardByAlias(alias);
    if (!card) continue;
    const energy = resolveModifiedCardEnergy(card, event.modifiers);
    totals.set(card.suit, (totals.get(card.suit) ?? 0) + energy);
  }

  return totals;
}

function matchesSuitQuantities(
  aliases: CardAlias[],
  requirements: SuitQuantity[]
): boolean {
  if (requirements.length === 0) return true;
  const counts = countBySuit(aliases);
  return requirements.every(
    (requirement) => (counts.get(requirement.suitId) ?? 0) >= requirement.quantity
  );
}

function matchesSuitEnergies(
  event: GameEventInstance,
  requirements: SuitEnergy[]
): boolean {
  if (requirements.length === 0) return true;
  const totals = energyBySuit(event);
  return requirements.every(
    (requirement) => (totals.get(requirement.suitId) ?? 0) >= requirement.total
  );
}

function matchesCardEmotions(
  aliases: CardAlias[],
  required: CardAlias[]
): boolean {
  if (required.length === 0) return true;
  return required.some((alias) => aliases.includes(alias));
}

/** True when this deal-breaker's configured conditions are met on the event. */
export function matchesDealBreaker(
  event: GameEventInstance,
  dealBreaker: DealBreaker
): boolean {
  const hasQuantityRule = dealBreaker.suitQuantities.length > 0;
  const hasEnergyRule = dealBreaker.suitEnergies.length > 0;
  const hasCardRule = dealBreaker.cardEmotions.length > 0;

  if (!hasQuantityRule && !hasEnergyRule && !hasCardRule) {
    return false;
  }

  const quantityOk =
    !hasQuantityRule ||
    matchesSuitQuantities(event.placedCardAliases, dealBreaker.suitQuantities);
  const energyOk =
    !hasEnergyRule || matchesSuitEnergies(event, dealBreaker.suitEnergies);
  const cardsOk =
    !hasCardRule ||
    matchesCardEmotions(event.placedCardAliases, dealBreaker.cardEmotions);

  return quantityOk && energyOk && cardsOk;
}

/** First matching deal-breaker on the event, if any. */
export function findMatchingDealBreaker(
  event: GameEventInstance
): DealBreaker | null {
  for (const dealBreaker of event.dealBreakers ?? []) {
    if (matchesDealBreaker(event, dealBreaker)) {
      return dealBreaker;
    }
  }
  return null;
}

export function getSuitCounts(event: GameEventInstance): Map<CardSuit, number> {
  return countBySuit(event.placedCardAliases);
}
