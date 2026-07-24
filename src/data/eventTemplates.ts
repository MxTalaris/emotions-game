import { GameEventDefinition, PersonalityId } from '../types';
import eventTemplatesJson from './event-templates.json';

export interface EventSeedDefinition {
  id: string;
  /** Personality aliases that unlock this seed (0–2). Order does not matter. */
  personalities: PersonalityId[];
  events: GameEventDefinition[];
}

interface EventSeedsFile {
  seeds: EventSeedDefinition[];
}

const seedsFile = eventTemplatesJson as EventSeedsFile;

export const eventSeeds: EventSeedDefinition[] = seedsFile.seeds.map((seed) => ({
  id: seed.id,
  personalities: [...seed.personalities],
  events: seed.events as GameEventDefinition[],
}));

function normalizePersonalities(personalities: PersonalityId[]): PersonalityId[] {
  return [...new Set(personalities)].sort();
}

function personalitiesKey(personalities: PersonalityId[]): string {
  return normalizePersonalities(personalities).join('|');
}

/** Seed id from selection: "basic", "warm", "guarded", "guarded-warm", ... */
export function buildSeedId(selectedPersonalities: PersonalityId[]): string {
  const normalized = normalizePersonalities(selectedPersonalities);
  return normalized.length === 0 ? 'basic' : normalized.join('-');
}

const seedByPersonalityKey = new Map<string, EventSeedDefinition>();
const seedById = new Map<string, EventSeedDefinition>();

for (const seed of eventSeeds) {
  seedByPersonalityKey.set(personalitiesKey(seed.personalities), seed);
  seedById.set(seed.id, seed);
}

export function getSeedById(id: string): EventSeedDefinition | undefined {
  return seedById.get(id);
}

function getBasicSeed(): EventSeedDefinition {
  return seedByPersonalityKey.get('') ?? eventSeeds[0];
}

/**
 * Resolves the event pack for a run from selected personalities.
 * Selection [] → basic. Otherwise matches the pack for that exact set.
 */
export function resolveSeed(
  selectedPersonalities: PersonalityId[]
): EventSeedDefinition {
  const normalized = normalizePersonalities(selectedPersonalities);
  const id = buildSeedId(normalized);

  if (normalized.length === 0) {
    return getBasicSeed();
  }

  const matched =
    seedByPersonalityKey.get(personalitiesKey(normalized)) ?? getSeedById(id);

  if (matched) {
    return matched;
  }

  console.error(
    `No event pack for seed "${id}". Available: ${eventSeeds.map((s) => s.id).join(', ')}`
  );
  return getBasicSeed();
}
