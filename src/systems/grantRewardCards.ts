import { getCardByAlias } from '../data/cards';
import { CardAlias, CardDefinition } from '../types';

export function resolveRewardCards(aliases: CardAlias[]): CardDefinition[] {
  return aliases
    .map((alias) => getCardByAlias(alias))
    .filter((card): card is CardDefinition => card !== undefined);
}
