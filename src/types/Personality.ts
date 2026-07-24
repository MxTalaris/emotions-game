/** Stable identity of a personality model from the catalog. */
export type PersonalityId = string;

export interface PersonalityDefinition {
  id: PersonalityId;
  name: string;
}

/**
 * Target for createEvent actions:
 * - all — every personality
 * - basic — the default/basic personality set
 * - specific catalog id (e.g. "warm")
 */
export type EventPersonalityRef = 'all' | 'basic' | PersonalityId;
