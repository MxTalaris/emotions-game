import { CardDefinition } from '../types';

/** Constant sentiment card used for optional events and hand padding. */
export const APATHY_CARD: CardDefinition = {
  id: 0,
  name: 'Apatia',
  image: '',
  suit: 'apathy',
  energyAmount: 10,
  duration: 1,
  fadedEmotion: null,
};

export const cards: CardDefinition[] = [
  {
    id: 1,
    name: 'Alegria',
    image: '',
    suit: 'positive',
    energyAmount: 25,
    duration: 3,
    fadedEmotion: null,
  },
  {
    id: 2,
    name: 'Tristeza',
    image: '',
    suit: 'negative',
    energyAmount: 20,
    duration: 2,
    fadedEmotion: 7,
  },
  {
    id: 3,
    name: 'Raiva',
    image: '',
    suit: 'negative',
    energyAmount: 55,
    duration: 2,
    fadedEmotion: null,
  },
  {
    id: 4,
    name: 'Medo',
    image: '',
    suit: 'negative',
    energyAmount: 30,
    duration: 3,
    fadedEmotion: null,
  },
  {
    id: 5,
    name: 'Surpresa',
    image: '',
    suit: 'neutral',
    energyAmount: 15,
    duration: 1,
    fadedEmotion: null,
  },
  {
    id: 6,
    name: 'Nojo',
    image: '',
    suit: 'negative',
    energyAmount: 35,
    duration: 2,
    fadedEmotion: null,
  },
];

export function getCardById(id: number): CardDefinition | undefined {
  if (id === APATHY_CARD.id) return APATHY_CARD;
  return cards.find((card) => card.id === id);
}
