import { GameEventDefinition, PersonalityId } from '../types';
import eventTemplatesJson from './event-templates.json';

export interface EventTemplatesFile {
  events: GameEventDefinition[];
}

const templatesFile = eventTemplatesJson as EventTemplatesFile;

export const eventTemplates: GameEventDefinition[] = templatesFile.events.map(
  (event) => ({
    ...event,
    personalities: event.personalities ? [...event.personalities] : undefined,
  })
);

function normalizePersonalities(personalities: PersonalityId[]): PersonalityId[] {
  return [...new Set(personalities)].sort();
}

export function baseEventMatchesSelection(
  eventPersonalities: PersonalityId[],
  selectedPersonalities: PersonalityId[]
): boolean {
  const eventTags = normalizePersonalities(eventPersonalities);
  const selected = normalizePersonalities(selectedPersonalities);

  if (eventTags.length === 0) {
    return selected.length === 0;
  }

  return eventTags.every((personality) => selected.includes(personality));
}

/** Base events unlocked by the personalities chosen on the start screen. */
export function resolveBaseEvents(
  selectedPersonalities: PersonalityId[]
): GameEventDefinition[] {
  return eventTemplates.filter(
    (event) =>
      event.isBase &&
      baseEventMatchesSelection(event.personalities ?? [], selectedPersonalities)
  );
}

export function getEventTemplateById(
  id: number
): GameEventDefinition | undefined {
  return eventTemplates.find((event) => event.id === id);
}
