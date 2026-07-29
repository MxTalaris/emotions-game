import soundsCatalogJson from './sounds-catalog.json';

export const SOUND_SFX_IDS = [
  'feelClick',
  'cardDragStart',
  'cardDropEvent',
  'eventCompleteSpawn',
] as const;

export const SOUND_BGM_ID = 'backgroundMusic' as const;

export const SOUND_ACTION_IDS = [...SOUND_SFX_IDS, SOUND_BGM_ID] as const;

export type SoundSfxId = (typeof SOUND_SFX_IDS)[number];
export type SoundActionId = (typeof SOUND_ACTION_IDS)[number];

export interface SoundActionConfig {
  /** Public URL path, e.g. /storage/audio/feelClick-….mp3. Null/empty = silent. */
  path: string | null;
  volume: number;
}

export type SoundsCatalog = Record<SoundActionId, SoundActionConfig>;

export const SOUND_ACTION_LABELS: Record<SoundActionId, string> = {
  feelClick: 'Clique do Sentir',
  cardDragStart: 'Clique para arrastar carta',
  cardDropEvent: 'Drop da carta no evento',
  eventCompleteSpawn: 'Evento concluído gerando novo evento',
  backgroundMusic: 'Som de fundo (BGM)',
};

/** Built-in fallback when catalog has no custom BGM path. */
export const DEFAULT_BGM_PATH = 'assets/audio/bgm-sirens.mp3';

function normalizeEntry(
  raw: Partial<SoundActionConfig> | undefined,
  defaultVolume: number
): SoundActionConfig {
  const path =
    typeof raw?.path === 'string' && raw.path.trim() ? raw.path.trim() : null;
  const volume =
    typeof raw?.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.min(1, Math.max(0, raw.volume))
      : defaultVolume;
  return { path, volume };
}

const DEFAULT_VOLUMES: Record<SoundActionId, number> = {
  feelClick: 0.6,
  cardDragStart: 0.45,
  cardDropEvent: 0.5,
  eventCompleteSpawn: 0.55,
  backgroundMusic: 0.35,
};

function loadCatalog(raw: Record<string, Partial<SoundActionConfig>>): SoundsCatalog {
  const catalog = {} as SoundsCatalog;
  for (const id of SOUND_ACTION_IDS) {
    catalog[id] = normalizeEntry(raw[id], DEFAULT_VOLUMES[id]);
  }
  return catalog;
}

export function createEmptySoundsCatalog(): SoundsCatalog {
  const catalog = {} as SoundsCatalog;
  for (const id of SOUND_ACTION_IDS) {
    catalog[id] = normalizeEntry(undefined, DEFAULT_VOLUMES[id]);
  }
  return catalog;
}

export const soundsCatalog: SoundsCatalog = loadCatalog(
  soundsCatalogJson as Record<string, Partial<SoundActionConfig>>
);

export function getSoundAction(id: SoundActionId): SoundActionConfig {
  return soundsCatalog[id];
}

/** Resolved BGM path + volume (custom upload or built-in default). */
export function getBackgroundMusicConfig(): SoundActionConfig & { path: string } {
  const entry = soundsCatalog.backgroundMusic;
  return {
    path: entry.path ?? DEFAULT_BGM_PATH,
    volume: entry.volume,
  };
}
