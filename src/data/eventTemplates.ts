import { GameEventDefinition } from '../types';
import eventTemplatesJson from './event-templates.json';

export const eventTemplates: GameEventDefinition[] =
  eventTemplatesJson as GameEventDefinition[];

export function getEventTemplateById(
  id: number | string
): GameEventDefinition | undefined {
  const numericId = typeof id === 'string' ? Number(id) : id;
  if (Number.isNaN(numericId)) return undefined;
  return eventTemplates.find((template) => template.id === numericId);
}

export function getBaseEventTemplates(): GameEventDefinition[] {
  return eventTemplates.filter((template) => template.isBase);
}
