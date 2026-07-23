export interface GameEventDefinition {
  id: number;
  label: string;
  energyAmount: number;
  /** When true, energy progress stays hidden (gray bar with ?). */
  energyAmountSecret: boolean;
  cardsPerTurn: number;
  /** Turns on screen before auto-complete; 0 = never. */
  autoComplete: number;
  /** When true, auto-complete total is shown as ?. */
  autoCompleteSecret: boolean;
  cardsRequired: boolean;
  isBase?: boolean;
  triggers?: number[];
  rewardCards?: number[];
  rules?: unknown[];
}

export interface GameEventInstance extends GameEventDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  parentId?: number;
  placedCardIds: number[];
  progress: number;
  cardsPlacedThisTurn: number;
  /** Turns elapsed since this event appeared (incremented on Sentir). */
  turnsAlive: number;
  completed: boolean;
}
