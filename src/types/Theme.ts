import { SoundActionId, SoundsCatalog } from '../data/sounds';

export interface ThemeBackground {
  image: string | null;
  skyTop: string;
  skyMid: string;
  ground: string;
}

export interface ThemeBorders {
  stroke: string;
  ready: string;
  connector: string;
  completedStroke: string;
  fill: string;
}

export interface ThemeButtons {
  fill: string;
  stroke: string;
  hover: string;
  disabled: string;
  labelText: string;
}

export interface ThemeEventColorsHex {
  fill: string;
  stroke: string;
  completed: string;
  completedStroke: string;
  flowerCenter: string;
  flowerPetal: string;
  flowerPetalAlt: string;
  ready: string;
  connector: string;
  slotDot: string;
  slotDotFilled: string;
  slotRequired: string;
  energyBarBg: string;
  energyBarFill: string;
  energyBarSecret: string;
}

export interface ThemeEntry {
  alias: string;
  name: string;
  background: ThemeBackground;
  borders: ThemeBorders;
  buttons: ThemeButtons;
  eventColors: ThemeEventColorsHex;
  sounds: SoundsCatalog;
}

export interface ThemesCatalogFile {
  defaultTheme: string;
  themes: ThemeEntry[];
}

export type ResolvedEventColors = Record<
  keyof ThemeEventColorsHex,
  number
>;

export interface ResolvedButtonColors {
  fill: number;
  stroke: number;
  hover: number;
  disabled: number;
  labelText: string;
}

export interface ResolvedThemeBackground {
  image: string | null;
  skyTop: number;
  skyMid: number;
  ground: number;
}

export interface ResolvedTheme {
  alias: string;
  name: string;
  background: ResolvedThemeBackground;
  buttons: ResolvedButtonColors;
  eventColors: ResolvedEventColors;
  sounds: SoundsCatalog;
}

export const THEME_EVENT_COLOR_KEYS = [
  'fill',
  'stroke',
  'completed',
  'completedStroke',
  'flowerCenter',
  'flowerPetal',
  'flowerPetalAlt',
  'ready',
  'connector',
  'slotDot',
  'slotDotFilled',
  'slotRequired',
  'energyBarBg',
  'energyBarFill',
  'energyBarSecret',
] as const satisfies readonly (keyof ThemeEventColorsHex)[];

export const THEME_BORDER_KEYS = [
  'stroke',
  'ready',
  'connector',
  'completedStroke',
  'fill',
] as const satisfies readonly (keyof ThemeBorders)[];

export const THEME_BORDER_LABELS: Record<keyof ThemeBorders, string> = {
  stroke: 'Borda padrão',
  ready: 'Borda pronta',
  connector: 'Ramos / conectores',
  completedStroke: 'Borda concluída',
  fill: 'Preenchimento',
};

export const THEME_BUTTON_LABELS: Record<keyof ThemeButtons, string> = {
  fill: 'Fundo',
  stroke: 'Borda',
  hover: 'Hover',
  disabled: 'Desabilitado',
  labelText: 'Texto',
};

export const THEME_BACKGROUND_LABELS: Record<
  keyof Omit<ThemeBackground, 'image'>,
  string
> = {
  skyTop: 'Céu (topo)',
  skyMid: 'Céu (meio)',
  ground: 'Solo',
};

export type ThemeSoundId = SoundActionId;
