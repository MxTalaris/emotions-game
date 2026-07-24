import { getBaseEventTemplates, getEventTemplateById } from '../data/eventTemplates';
import { EventPersonalityRef, GameEventDefinition, GameEventInstance } from '../types';
import {
  createEventInstance,
  layoutBaseEvents,
  layoutChildEventsWithoutOverlap,
  TreePosition,
} from './eventTreeLayout';

export interface PendingEventSpawn {
  parentInstanceId: number;
  templateId: number;
  personality: EventPersonalityRef;
  remainingDelay: number;
}

export class EventManager {
  /** Template ids already spawned (a model is only introduced once). */
  private spawnedTemplateIds = new Set<number>();
  /** Board positions keyed by event instanceId. */
  private eventNodes = new Map<number, TreePosition>();
  private pendingSpawns: PendingEventSpawn[] = [];

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

      this.spawnedTemplateIds.add(template.id);
      this.eventNodes.set(instance.instanceId, position);

      return instance;
    });
  }

  /** Spawn child events from template ids under a parent instance. */
  spawnChildEvents(
    parent: GameEventInstance,
    templateIds: number[]
  ): GameEventInstance[] {
    if (templateIds.length === 0) return [];

    const parentPosition = this.eventNodes.get(parent.instanceId);
    if (!parentPosition) return [];

    const templatesToSpawn = templateIds
      .filter((id) => !this.spawnedTemplateIds.has(id))
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
      const instance = createEventInstance(
        template,
        position,
        parent.instanceId
      );

      this.spawnedTemplateIds.add(template.id);
      this.eventNodes.set(instance.instanceId, position);

      return instance;
    });
  }

  enqueueChildEvent(
    parentInstanceId: number,
    templateId: number,
    personality: EventPersonalityRef,
    delay: number
  ): void {
    this.pendingSpawns.push({
      parentInstanceId,
      templateId,
      personality,
      remainingDelay: Math.max(0, delay),
    });
  }

  /**
   * Decrements delayed spawns and returns those ready to spawn (remainingDelay <= 0).
   * Call once at the start of each Sentir before resolving new results.
   */
  tickPendingSpawns(
    findParent: (instanceId: number) => GameEventInstance | undefined
  ): Array<{ parent: GameEventInstance; children: GameEventInstance[] }> {
    const ready: PendingEventSpawn[] = [];
    const stillWaiting: PendingEventSpawn[] = [];

    for (const pending of this.pendingSpawns) {
      pending.remainingDelay -= 1;
      if (pending.remainingDelay <= 0) {
        ready.push(pending);
      } else {
        stillWaiting.push(pending);
      }
    }

    this.pendingSpawns = stillWaiting;

    const batches: Array<{
      parent: GameEventInstance;
      children: GameEventInstance[];
    }> = [];

    for (const pending of ready) {
      const parent = findParent(pending.parentInstanceId);
      if (!parent) continue;
      const children = this.spawnChildEvents(parent, [pending.templateId]);
      if (children.length > 0) {
        batches.push({ parent, children });
      }
    }

    return batches;
  }
}
