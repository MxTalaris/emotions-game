export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 120;
export const HAND_Y = GAME_HEIGHT - CARD_HEIGHT / 2 - 20;
export const HAND_PADDING = 24;
export const HAND_CARD_SCALE = 0.78;
export const HAND_CARD_HOVER_SCALE = 0.92;

/** Radial "spinning wheel" hand layout. */
export const HAND_WHEEL = {
  /** Wheel radius in px; larger = flatter arc at the top. */
  radius: 470,
  /** Angular gap between adjacent cards, in degrees. */
  angleStepDeg: 6,
  /** Drag sensitivity: degrees rotated per pixel dragged horizontally. */
  degPerPixel: 0.16,
  /** Wheel sensitivity: degrees rotated per wheel delta unit. */
  degPerWheel: 0.09,
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
  branchWidth: 3.5,
  branchGrowMs: 650,
  flowerBloomMs: 520,
  seedRevealMs: 280,
  /** Flower radius relative to max(event width, height). */
  flowerRadiusScale: 0.72,
};

/** Padding below the top UI where the tree viewport starts. */
export const EVENT_VIEW_TOP = 70;

export const TREE_ZOOM = {
  min: 0.5,
  max: 2.5,
  default: 1,
};

export const EVENT_COLORS = {
  /** Seed body when turn slots are full. */
  fill: 0x8d6e4c,
  /** Seed outline (idle). */
  stroke: 0xa67c52,
  /** Flower petal fill. */
  completed: 0xe891a8,
  /** Flower petal / center outline. */
  completedStroke: 0xc45d7a,
  flowerCenter: 0xf5d76e,
  flowerPetal: 0xe891a8,
  flowerPetalAlt: 0xf0a8b8,
  /** Ready-to-bloom accent. */
  ready: 0xe8a838,
  /** Branch / ramification. */
  connector: 0x6b4f2e,
  slotDot: 0xb8a078,
  slotDotFilled: 0x7a9e5a,
  slotRequired: 0xef5350,
  energyBarBg: 0x3d4a2e,
  energyBarFill: 0x7cb342,
  energyBarSecret: 0x757575,
  /** Soft sky → earth backdrop. */
  skyTop: 0xc5dff0,
  skyMid: 0xe8f0d8,
  ground: 0xd4c4a8,
};

export const FEEL_BUTTON = {
  x: GAME_WIDTH - 70,
  y: 36,
  width: 120,
  height: 44,
};

export const MUSIC_BUTTON = {
  x: GAME_WIDTH - 160,
  y: 36,
  size: 44,
};

/** Background music (path/volume come from sounds-catalog). */
export const BGM = {
  key: 'bgm',
  loop: true,
};
