import { PersonalityDefinition, PersonalityId } from '../types';
import personalitiesCatalog from './personalities-catalog.json';

const byId = new Map<PersonalityId, PersonalityDefinition>();

for (const entry of personalitiesCatalog as PersonalityDefinition[]) {
  byId.set(entry.id, { id: entry.id, name: entry.name });
}

/** All personalities from personalities-catalog.json. */
export const personalities: PersonalityDefinition[] = Array.from(byId.values());

export function getPersonalityById(
  id: PersonalityId
): PersonalityDefinition | undefined {
  return byId.get(id);
}

export function isCatalogPersonalityId(id: string): boolean {
  return byId.has(id);
}

/** True for reserved refs or a known catalog personality. */
export function isValidEventPersonalityRef(value: string): boolean {
  return value === 'all' || value === 'basic' || isCatalogPersonalityId(value);
}
