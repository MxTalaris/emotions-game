import { getBaseEventTemplates, getEventTemplateById } from '../data/eventTemplates';
import { GameEventDefinition, GameEventInstance } from '../types';
import {
  createEventInstance,
  layoutBaseEvents,
  layoutChildEventsWithoutOverlap,
  TreePosition,
} from './eventTreeLayout';

export class EventManager {
  private spawnedIds = new Set<number>();
  private eventNodes = new Map<number, TreePosition>();

  generateInitialEvents(): GameEventInstance[] {
    const baseTemplates = getBaseEventTemplates();

    if (baseTemplates.length !== 2) {
      console.warn(
        `EventManager: expected 2 base events, found ${baseTemplates.length}.`
      );
    }

    const positions = layoutBaseEvents(baseTemplates.length);

    return baseTemplates.map((template, index) => {
      const position = positions[index];
      const instance = createEventInstance(template, position);

      this.spawnedIds.add(instance.id);
      this.eventNodes.set(instance.id, position);

      return instance;
    });
  }

  resolveTriggers(completedEvent: GameEventInstance): GameEventInstance[] {
    const triggerIds = completedEvent.triggers ?? [];
    if (triggerIds.length === 0) return [];

    const parentPosition = this.eventNodes.get(completedEvent.id);
    if (!parentPosition) return [];

    const templatesToSpawn = triggerIds
      .filter((id) => !this.spawnedIds.has(id))
      .map((id) => getEventTemplateById(id))
      .filter((template): template is GameEventDefinition => template !== undefined);

    if (templatesToSpawn.length === 0) return [];

    const occupied = Array.from(this.eventNodes.values());
    const childPositions = layoutChildEventsWithoutOverlap(
      parentPosition,
      templatesToSpawn.length,
      occupied
    );

    return templatesToSpawn.map((template, index) => {
      const position = childPositions[index];
      const instance = createEventInstance(template, position, completedEvent.id);

      this.spawnedIds.add(instance.id);
      this.eventNodes.set(instance.id, position);

      return instance;
    });
  }
}
