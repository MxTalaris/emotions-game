import { CardSuit } from '../types/Card';

export interface PersonalityEntry {
  id: string;
  name: string;
}

export interface EmotionCatalogEntry {
  id: string;
  name: string;
  energy: number;
  duration: number;
  fadedEmotion: string[] | null;
  /** Public URL path, e.g. /storage/cards/joy-basic-….png */
  image?: string;
}

export interface EmotionSuitGroup {
  color: string;
  cards: EmotionCatalogEntry[];
}

export type EmotionsCatalog = Record<string, EmotionSuitGroup>;

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
  alias: string;
  suitQuantities: SuitQuantity[];
  suitEnergies: SuitEnergy[];
  cardEmotions: string[];
}

export type EventOutputInput =
  | { type: 'default' }
  | { type: 'suitQuantities'; suitQuantities: SuitQuantity[] }
  | { type: 'suitEnergies'; suitEnergies: SuitEnergy[] }
  | { type: 'cardEmotions'; cardEmotions: string[] };

export interface EventOutput {
  input: EventOutputInput;
  exclusive: boolean;
  priority: number;
  outputEmotions: string | string[];
}

export type EventResultType =
  | { type: 'default' }
  | { type: 'dealbreaker'; parameters: string }
  | { type: 'majority'; parameters: string }
  | { type: 'specific'; parameters: string };

export type EventAction =
  | {
      type: 'createEvent';
      personality: string;
      event: string;
      delay: number;
    }
  | {
      type: 'createEmotion';
      emotions: string | string[];
    }
  | {
      type: 'generatePersonality';
      personality: string;
    }
  | {
      type: 'endGame';
    };

export interface EventResult {
  type: EventResultType;
  outputOverride: boolean;
  exclusive: boolean;
  priority: number;
  actions: EventAction[];
}

export interface EventModifiers {
  suits?: Partial<Record<string, number>>;
  cards?: Partial<Record<string, number>>;
}

export interface GameEventDefinition {
  id: number;
  label: string;
  energyAmount: number;
  energyAmountSecret: boolean;
  cardsPerTurn: number;
  autoComplete: number;
  autoCompleteSecret: boolean;
  cardsRequired: boolean;
  modifiers?: EventModifiers;
  dealBreakers?: DealBreaker[];
  isBase?: boolean;
  results?: EventResult[];
  outputs?: EventOutput[];
  rules?: unknown[];
}

export interface EventSeedDefinition {
  id: string;
  personalities: string[];
  events: GameEventDefinition[];
}

export interface EventSeedsFile {
  seeds: EventSeedDefinition[];
}

export const PLAYABLE_SUITS: CardSuit[] = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'disgust',
  'apathy',
];

export const ALL_CARD_SUITS: CardSuit[] = [
  'joy',
  'sadness',
  'anger',
  'fear',
  'disgust',
  'apathy',
];
