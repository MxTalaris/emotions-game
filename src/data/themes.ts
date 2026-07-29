import themesCatalogJson from './themes-catalog.json';
import {
  createEmptySoundsCatalog,
  DEFAULT_BGM_PATH,
  SOUND_ACTION_IDS,
  SoundActionConfig,
  SoundsCatalog,
} from './sounds';
import {
  ResolvedButtonColors,
  ResolvedEventColors,
  ResolvedTheme,
  ResolvedThemeBackground,
  ThemeBackground,
  ThemeBorders,
  ThemeButtons,
  ThemeEntry,
  ThemeEventColorsHex,
  ThemesCatalogFile,
  THEME_BORDER_KEYS,
  THEME_EVENT_COLOR_KEYS,
} from '../types/Theme';

const BASIC_EVENT_COLORS: ThemeEventColorsHex = {
  fill: '#8d6e4c',
  stroke: '#a67c52',
  completed: '#e891a8',
  completedStroke: '#c45d7a',
  flowerCenter: '#f5d76e',
  flowerPetal: '#e891a8',
  flowerPetalAlt: '#f0a8b8',
  ready: '#e8a838',
  connector: '#6b4f2e',
  slotDot: '#b8a078',
  slotDotFilled: '#7a9e5a',
  slotRequired: '#ef5350',
  energyBarBg: '#3d4a2e',
  energyBarFill: '#7cb342',
  energyBarSecret: '#757575',
};

const BASIC_BORDERS: ThemeBorders = {
  stroke: '#a67c52',
  ready: '#e8a838',
  connector: '#6b4f2e',
  completedStroke: '#c45d7a',
  fill: '#8d6e4c',
};

const BASIC_BUTTONS: ThemeButtons = {
  fill: '#5c6bc0',
  stroke: '#7986cb',
  hover: '#7986cb',
  disabled: '#444444',
  labelText: '#ffffff',
};

const BASIC_BACKGROUND: ThemeBackground = {
  image: null,
  skyTop: '#c5dff0',
  skyMid: '#e8f0d8',
  ground: '#d4c4a8',
};

function hexToNumber(hex: string, fallback: number): number {
  const cleaned = hex.replace('#', '').trim();
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function normalizeSoundEntry(
  raw: Partial<SoundActionConfig> | undefined,
  fallback: SoundActionConfig
): SoundActionConfig {
  const path =
    raw?.path === null
      ? null
      : typeof raw?.path === 'string' && raw.path.trim()
        ? raw.path.trim()
        : fallback.path;
  const volume =
    typeof raw?.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.min(1, Math.max(0, raw.volume))
      : fallback.volume;
  return { path, volume };
}

function normalizeSounds(raw: Partial<SoundsCatalog> | undefined): SoundsCatalog {
  const fallback = createEmptySoundsCatalog();
  const sounds = {} as SoundsCatalog;
  for (const id of SOUND_ACTION_IDS) {
    sounds[id] = normalizeSoundEntry(raw?.[id], fallback[id]);
  }
  return sounds;
}

function syncBordersToEventColors(
  borders: ThemeBorders,
  eventColors: ThemeEventColorsHex
): ThemeEventColorsHex {
  return {
    ...eventColors,
    stroke: borders.stroke,
    ready: borders.ready,
    connector: borders.connector,
    completedStroke: borders.completedStroke,
    fill: borders.fill,
  };
}

function normalizeBorders(raw: Partial<ThemeBorders> | undefined): ThemeBorders {
  return {
    stroke: normalizeHex(raw?.stroke, BASIC_BORDERS.stroke),
    ready: normalizeHex(raw?.ready, BASIC_BORDERS.ready),
    connector: normalizeHex(raw?.connector, BASIC_BORDERS.connector),
    completedStroke: normalizeHex(raw?.completedStroke, BASIC_BORDERS.completedStroke),
    fill: normalizeHex(raw?.fill, BASIC_BORDERS.fill),
  };
}

function normalizeEventColors(
  raw: Partial<ThemeEventColorsHex> | undefined,
  borders: ThemeBorders
): ThemeEventColorsHex {
  const base = { ...BASIC_EVENT_COLORS };
  for (const key of THEME_EVENT_COLOR_KEYS) {
    base[key] = normalizeHex(raw?.[key], base[key]);
  }
  return syncBordersToEventColors(borders, base);
}

function normalizeBackground(raw: Partial<ThemeBackground> | undefined): ThemeBackground {
  const image =
    typeof raw?.image === 'string' && raw.image.trim() ? raw.image.trim() : null;
  return {
    image,
    skyTop: normalizeHex(raw?.skyTop, BASIC_BACKGROUND.skyTop),
    skyMid: normalizeHex(raw?.skyMid, BASIC_BACKGROUND.skyMid),
    ground: normalizeHex(raw?.ground, BASIC_BACKGROUND.ground),
  };
}

function normalizeButtons(raw: Partial<ThemeButtons> | undefined): ThemeButtons {
  return {
    fill: normalizeHex(raw?.fill, BASIC_BUTTONS.fill),
    stroke: normalizeHex(raw?.stroke, BASIC_BUTTONS.stroke),
    hover: normalizeHex(raw?.hover, BASIC_BUTTONS.hover),
    disabled: normalizeHex(raw?.disabled, BASIC_BUTTONS.disabled),
    labelText: normalizeHex(raw?.labelText, BASIC_BUTTONS.labelText),
  };
}

function normalizeTheme(raw: Partial<ThemeEntry>, index: number): ThemeEntry {
  const alias =
    typeof raw.alias === 'string' && raw.alias.trim()
      ? raw.alias.trim()
      : `theme-${index + 1}`;
  const borders = normalizeBorders(raw.borders);
  return {
    alias,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : alias,
    background: normalizeBackground(raw.background),
    borders,
    buttons: normalizeButtons(raw.buttons),
    eventColors: normalizeEventColors(raw.eventColors, borders),
    sounds: normalizeSounds(raw.sounds),
  };
}

function loadCatalog(raw: ThemesCatalogFile): ThemesCatalogFile {
  const themes = Array.isArray(raw.themes)
    ? raw.themes.map((entry, index) => normalizeTheme(entry, index))
    : [createBasicTheme()];
  const defaultTheme =
    typeof raw.defaultTheme === 'string' &&
    themes.some((theme) => theme.alias === raw.defaultTheme)
      ? raw.defaultTheme
      : themes[0]?.alias ?? 'basic';
  return { defaultTheme, themes };
}

export function createBasicTheme(): ThemeEntry {
  return normalizeTheme(
    {
      alias: 'basic',
      name: 'Basic',
      background: BASIC_BACKGROUND,
      borders: BASIC_BORDERS,
      buttons: BASIC_BUTTONS,
      eventColors: BASIC_EVENT_COLORS,
      sounds: createEmptySoundsCatalog(),
    },
    0
  );
}

export const themesCatalog: ThemesCatalogFile = loadCatalog(
  themesCatalogJson as ThemesCatalogFile
);

export function getThemeByAlias(alias: string): ThemeEntry | undefined {
  return themesCatalog.themes.find((theme) => theme.alias === alias);
}

export function getDefaultThemeAlias(): string {
  return themesCatalog.defaultTheme;
}

export function getDefaultTheme(): ThemeEntry {
  return (
    getThemeByAlias(themesCatalog.defaultTheme) ??
    themesCatalog.themes[0] ??
    createBasicTheme()
  );
}

export function resolveTheme(entry: ThemeEntry): ResolvedTheme {
  const eventColors = {} as ResolvedEventColors;
  for (const key of THEME_EVENT_COLOR_KEYS) {
    eventColors[key] = hexToNumber(entry.eventColors[key], 0xffffff);
  }

  const background: ResolvedThemeBackground = {
    image: entry.background.image,
    skyTop: hexToNumber(entry.background.skyTop, 0xc5dff0),
    skyMid: hexToNumber(entry.background.skyMid, 0xe8f0d8),
    ground: hexToNumber(entry.background.ground, 0xd4c4a8),
  };

  const buttons: ResolvedButtonColors = {
    fill: hexToNumber(entry.buttons.fill, 0x5c6bc0),
    stroke: hexToNumber(entry.buttons.stroke, 0x7986cb),
    hover: hexToNumber(entry.buttons.hover, 0x7986cb),
    disabled: hexToNumber(entry.buttons.disabled, 0x444444),
    labelText: entry.buttons.labelText,
  };

  return {
    alias: entry.alias,
    name: entry.name,
    background,
    buttons,
    eventColors,
    sounds: entry.sounds,
  };
}

export function resolveThemeByAlias(alias: string): ResolvedTheme | undefined {
  const entry = getThemeByAlias(alias);
  return entry ? resolveTheme(entry) : undefined;
}

export function getBackgroundMusicForTheme(
  sounds: SoundsCatalog
): SoundActionConfig & { path: string } {
  const entry = sounds.backgroundMusic;
  return {
    path: entry.path ?? DEFAULT_BGM_PATH,
    volume: entry.volume,
  };
}

export function themeBackgroundTextureKey(alias: string): string {
  return `theme-bg-${alias}`;
}

export function applyBordersToTheme(theme: ThemeEntry): ThemeEntry {
  return {
    ...theme,
    eventColors: syncBordersToEventColors(theme.borders, theme.eventColors),
  };
}

export function createThemeFromBasic(alias: string, name: string): ThemeEntry {
  const basic = getDefaultTheme();
  return applyBordersToTheme({
    ...basic,
    alias,
    name,
    background: { ...basic.background, image: null },
    borders: { ...basic.borders },
    buttons: { ...basic.buttons },
    eventColors: { ...basic.eventColors },
    sounds: normalizeSounds(basic.sounds),
  });
}

export { THEME_BORDER_KEYS, syncBordersToEventColors };
