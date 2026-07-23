import { getCardById } from '../data/cards';
import { CardDefinition } from '../types';

export function resolveRewardCards(cardIds: number[]): CardDefinition[] {
  return cardIds
    .map((id) => getCardById(id))
    .filter((card): card is CardDefinition => card !== undefined);
}
