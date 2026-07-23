export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 120;
export const HAND_Y = GAME_HEIGHT - CARD_HEIGHT / 2 - 20;
export const HAND_SPACING = 90;
export const HAND_PADDING = 24;

export const SUIT_COLORS: Record<string, number> = {
  positive: 0x4caf50,
  negative: 0xe53935,
  neutral: 0xffa726,
  apathy: 0x9e9e9e,
};

export const EVENT_TREE = {
  centerX: GAME_WIDTH / 2,
  baseY: 360,
  levelSpacing: 190,
  baseSpacing: 340,
  branchSpacing: 170,
  /** Minimum center-to-center distance between events on the same level. */
  minNodeDistance: 160,
  width: 120,
  height: 68,
  sidePadding: 70,
  placedCardScale: 0.32,
  placedCardGap: 6,
  placedCardOffsetY: 10,
  slotDotRadius: 7,
};

/** Padding below the top UI where the tree viewport starts. */
export const EVENT_VIEW_TOP = 70;

export const TREE_ZOOM = {
  min: 0.5,
  max: 2.5,
  default: 1,
};

export const EVENT_COLORS = {
  fill: 0x2d3561,
  stroke: 0x5c6bc0,
  completed: 0x43a047,
  completedStroke: 0x66bb6a,
  ready: 0xffa726,
  connector: 0x5c6bc0,
  slotDot: 0x9fa8da,
  slotDotFilled: 0x5c6bc0,
  slotRequired: 0xef5350,
  energyBarBg: 0x1a1a2e,
  energyBarFill: 0x66bb6a,
  energyBarSecret: 0x757575,
};

export const FEEL_BUTTON = {
  x: GAME_WIDTH - 70,
  y: 36,
  width: 120,
  height: 44,
};
