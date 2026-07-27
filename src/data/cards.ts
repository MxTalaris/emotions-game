import { CardAlias, CardDefinition, CardSuit } from '../types';
import emotionsCatalog from './emotions-catalog.json';

interface EmotionCatalogEntry {
  id: string;
  name: string;
  energy: number;
  duration: number;
  fadedEmotion: string[] | null;
  image?: string;
}

interface EmotionSuitGroup {
  color: string;
  cards: EmotionCatalogEntry[];
}

type EmotionsCatalog = Record<string, EmotionSuitGroup>;

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function loadCatalog(raw: EmotionsCatalog): {
  cards: CardDefinition[];
  apathy: CardDefinition;
  byAlias: Map<CardAlias, CardDefinition>;
  suitColors: Record<string, number>;
} {
  const cards: CardDefinition[] = [];
  const byAlias = new Map<CardAlias, CardDefinition>();
  const suitColors: Record<string, number> = {};
  let apathy: CardDefinition | null = null;

  for (const [suitKey, group] of Object.entries(raw)) {
    const suit = suitKey as CardSuit;
    suitColors[suit] = hexToNumber(group.color);

    for (const entry of group.cards) {
      const definition: CardDefinition = {
        alias: entry.id,
        name: entry.name,
        image: entry.image ?? '',
        suit,
        energyAmount: entry.energy,
        duration: entry.duration,
        fadedEmotion: entry.fadedEmotion,
      };

      byAlias.set(definition.alias, definition);

      if (suit === 'apathy') {
        apathy = definition;
      } else {
        cards.push(definition);
      }
    }
  }

  if (!apathy) {
    throw new Error('emotions-catalog.json must include an apathy suit card.');
  }

  return { cards, apathy, byAlias, suitColors };
}

const loaded = loadCatalog(emotionsCatalog as EmotionsCatalog);

/** Constant sentiment card used for optional events and hand padding. */
export const APATHY_CARD: CardDefinition = loaded.apathy;

/** Playable emotion catalog (excludes system apathy card). */
export const cards: CardDefinition[] = loaded.cards;

/** Suit colors from emotions-catalog.json (Phaser numeric). */
export const SUIT_COLORS: Record<string, number> = loaded.suitColors;

export function getCardByAlias(alias: CardAlias): CardDefinition | undefined {
  return loaded.byAlias.get(alias);
}

export function getCardsBySuit(suit: CardSuit): CardDefinition[] {
  if (suit === 'apathy') return [APATHY_CARD];
  return cards.filter((definition) => definition.suit === suit);
}

export function getSuitColor(suit: CardSuit | string): number {
  return SUIT_COLORS[suit] ?? 0x888888;
}

const PLAYABLE_SUITS: CardSuit[] = ['joy', 'sadness', 'anger', 'fear', 'disgust'];

/** One basic emotion card per playable suit (excludes apathy). */
export function getInitialHandCards(): CardDefinition[] {
  return PLAYABLE_SUITS.map((suit) => {
    const basic = getCardsBySuit(suit).find((card) => card.alias.endsWith('-basic'));
    if (!basic) {
      throw new Error(`Missing basic card for suit "${suit}" in emotions catalog.`);
    }
    return basic;
  });
}
