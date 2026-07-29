import { EventModifiers } from '../systems/resolveModifiedCardEnergy';
import { CardAlias, CardSuit } from './Card';
import { EventPersonalityRef, PersonalityId } from './Personality';

export interface SuitQuantity {
  suitId: CardSuit;
  quantity: number;
}

export interface SuitEnergy {
  suitId: CardSuit;
  total: number;
}

export interface DealBreaker {
  id: number;
  /** Stable alias used by result type "dealbreaker". */
  alias: string;
  /** Minimum count of cards per suit that triggers this deal-breaker. */
  suitQuantities: SuitQuantity[];
  /** Minimum total energy per suit that triggers this deal-breaker. */
  suitEnergies: SuitEnergy[];
  /** Specific card models (aliases) that trigger this deal-breaker. */
  cardEmotions: CardAlias[];
}

/**
 * Condition for an event output — type + related fields live together.
 * - default: at least one card attached this turn (Sentir)
 * - suitQuantities / suitEnergies / cardEmotions: same idea as dealBreakers
 */
export type EventOutputInput =
  | { type: 'default' }
  | { type: 'suitQuantities'; suitQuantities: SuitQuantity[] }
  | { type: 'suitEnergies'; suitEnergies: SuitEnergy[] }
  | { type: 'cardEmotions'; cardEmotions: CardAlias[] };

/** Grants the exact cards placed on this event during Sentir. */
export const OUTPUT_PLACED_CARDS = 'input' as const;

export type OutputEmotionRef = CardAlias | typeof OUTPUT_PLACED_CARDS;

export interface EventOutput {
  input: EventOutputInput;
  /** If true and valid, non-exclusive outputs are ignored. */
  exclusive: boolean;
  /** Among multiple valid exclusives, highest priority wins. */
  priority: number;
  /** One or more emotion models granted when this output wins. */
  outputEmotions: OutputEmotionRef | OutputEmotionRef[];
}

export type EventResultType =
  | { type: 'default' }
  | { type: 'dealbreaker'; parameters: string }
  | { type: 'majority'; parameters: string }
  | { type: 'specific'; parameters: string };

export type EventAction =
  | {
      type: 'createEvent';
      /**
       * Who this event is created for:
       * "all" | "basic" | personality id from personalities-catalog.json
       */
      personality: EventPersonalityRef;
      /** Event template id as string. */
      event: string;
      /** Turns to wait before spawning (0 = immediate). */
      delay: number;
    }
  | {
      type: 'createEmotion';
      emotions: CardAlias | CardAlias[];
    }
  | {
      type: 'generatePersonality';
      /** Personality alias from personalities-catalog.json. */
      personality: PersonalityId;
    }
  | {
      type: 'endGame';
    }
  | {
      type: 'changeTheme';
      /** Theme alias from themes-catalog.json */
      theme: string;
    };

export interface EventResult {
  type: EventResultType;
  /** When true, skip processing this event's outputs on Sentir. */
  outputOverride: boolean;
  exclusive: boolean;
  priority: number;
  actions: EventAction[];
}

export type EventCompletionCause = 'energy' | 'autoComplete' | 'dealBreaker';

/** Catalog / template model for an event. */
export interface GameEventDefinition {
  /** Stable template id (used by results / catalog lookups). */
  id: number;
  label: string;
  description: string;
  energyAmount: number;
  /** When true, energy progress stays hidden (gray bar with ?). */
  energyAmountSecret: boolean;
  cardsPerTurn: number;
  /** Turns on screen before auto-complete; 0 = never. */
  autoComplete: number;
  /** When true, auto-complete total is shown as ?. */
  autoCompleteSecret: boolean;
  cardsRequired: boolean;
  /**
   * Alters energy contribution of placed cards by suit and/or card alias.
   * Alias rules override suit rules.
   */
  modifiers?: EventModifiers;
  /** Conditions that can break / fail the event when met. */
  dealBreakers?: DealBreaker[];
  isBase?: boolean;
  /** Conditional follow-up actions when the event completes. */
  results?: EventResult[];
  /** Conditional emotion grants resolved on Sentir. */
  outputs?: EventOutput[];
  rules?: unknown[];
}

/** Runtime event on the board — unique instanceId, same template id as its model. */
export interface GameEventInstance extends GameEventDefinition {
  /** Unique runtime id for this event copy on the board. */
  instanceId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  /** Parent event instanceId, if spawned from a result. */
  parentInstanceId?: number;
  /** Card model aliases placed on this event (order preserved). */
  placedCardAliases: CardAlias[];
  /** Subset of placedCardAliases attached since the last Sentir. */
  thisTurnPlacedCardAliases: CardAlias[];
  progress: number;
  cardsPlacedThisTurn: number;
  /** Turns elapsed since this event appeared (incremented on Sentir). */
  turnsAlive: number;
  completed: boolean;
  /** How this event was completed, if completed. */
  completionCause?: EventCompletionCause;
  /** Deal-breaker alias when completionCause === 'dealBreaker'. */
  matchedDealBreakerAlias?: string;
}
