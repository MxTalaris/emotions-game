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

export const OUTPUT_PLACED_CARDS = 'input' as const;

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
  description: string;
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

export const SOUND_SFX_IDS = [
  'feelClick',
  'cardDragStart',
  'cardDropEvent',
  'eventCompleteSpawn',
] as const;

export const SOUND_BGM_ID = 'backgroundMusic' as const;

export const SOUND_ACTION_IDS = [...SOUND_SFX_IDS, SOUND_BGM_ID] as const;

export type SoundSfxId = (typeof SOUND_SFX_IDS)[number];
export type SoundActionId = (typeof SOUND_ACTION_IDS)[number];

export interface SoundActionConfig {
  /** Public URL path, e.g. /storage/audio/feelClick-….mp3. Null = silent. */
  path: string | null;
  volume: number;
}

export type SoundsCatalog = Record<SoundActionId, SoundActionConfig>;

export const SOUND_ACTION_LABELS: Record<SoundActionId, string> = {
  feelClick: 'Clique do Sentir',
  cardDragStart: 'Clique para arrastar carta',
  cardDropEvent: 'Drop da carta no evento',
  eventCompleteSpawn: 'Evento concluído gerando novo evento',
  backgroundMusic: 'Som de fundo (BGM)',
};

export function createEmptySoundsCatalog(): SoundsCatalog {
  return {
    feelClick: { path: null, volume: 0.6 },
    cardDragStart: { path: null, volume: 0.45 },
    cardDropEvent: { path: null, volume: 0.5 },
    eventCompleteSpawn: { path: null, volume: 0.55 },
    backgroundMusic: { path: null, volume: 0.35 },
  };
}
