/** Stable identity of a card model (shared by all instances of that feeling). */
export type CardAlias = string;

/** Emotional suit / family the card belongs to. */
export type CardSuit = 'joy' | 'sadness' | 'anger' | 'fear' | 'disgust' | 'apathy';

/** Catalog model — shared by every generated copy of this feeling. */
export interface CardDefinition {
  alias: CardAlias;
  name: string;
  image: string;
  suit: CardSuit;
  energyAmount: number;
  duration: number;
  /** Card models this emotion fades into when duration ends (may repeat). */
  fadedEmotion: CardAlias[] | null;
}

/** Runtime copy of a card — unique instanceId, same alias/suit as its model. */
export interface CardInstance {
  instanceId: number;
  alias: CardAlias;
  name: string;
  image: string;
  suit: CardSuit;
  energyAmount: number;
  duration: number;
  fadedEmotion: CardAlias[] | null;
  remainingDuration: number;
  /** Event instance this card is placed on, if any. */
  eventInstanceId?: number;
}

let nextCardInstanceId = 1;

export function createCardInstance(definition: CardDefinition): CardInstance {
  return {
    instanceId: nextCardInstanceId++,
    alias: definition.alias,
    name: definition.name,
    image: definition.image,
    suit: definition.suit,
    energyAmount: definition.energyAmount,
    duration: definition.duration,
    fadedEmotion: definition.fadedEmotion,
    remainingDuration: definition.duration,
  };
}

/** Test helper / reset between runs if needed. */
export function resetCardInstanceIds(startAt = 1): void {
  nextCardInstanceId = startAt;
}
