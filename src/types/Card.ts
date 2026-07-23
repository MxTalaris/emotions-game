export interface CardDefinition {
  id: number;
  name: string;
  image: string;
  suit: string;
  energyAmount: number;
  duration: number;
  fadedEmotion: number | null;
}

export interface CardInstance extends CardDefinition {
  remainingDuration: number;
  eventId?: number;
}

export function createCardInstance(definition: CardDefinition): CardInstance {
  return {
    ...definition,
    remainingDuration: definition.duration,
  };
}
