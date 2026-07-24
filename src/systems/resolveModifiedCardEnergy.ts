import { CardAlias, CardDefinition, CardSuit } from '../types';

/** Multipliers that alter card energy when placed on an event. */
export interface EventModifiers {
  /** Suit → energy multiplier (e.g. { joy: 1.5 }). */
  suits?: Partial<Record<CardSuit, number>>;
  /** Card model alias → energy multiplier (e.g. { raiva: 2 }). */
  cards?: Partial<Record<CardAlias, number>>;
}

/**
 * Resolves effective energy for a card on an event with optional modifiers.
 * Alias (model) multipliers take priority over suit multipliers.
 */
export function resolveModifiedCardEnergy(
  card: CardDefinition | undefined,
  modifiers?: EventModifiers
): number {
  const base = card?.energyAmount ?? 0;
  if (!card || !modifiers) return base;

  const byAlias = modifiers.cards?.[card.alias];
  if (byAlias != null) {
    return base * byAlias;
  }

  const bySuit = modifiers.suits?.[card.suit];
  if (bySuit != null) {
    return base * bySuit;
  }

  return base;
}
