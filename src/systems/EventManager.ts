import {
  EventPersonalityRef,
  GameEventDefinition,
  GameEventInstance,
  PersonalityId,
} from '../types';
import {
  eventTemplates,
  resolveBaseEvents,
} from '../data/eventTemplates';
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
  private readonly events: GameEventDefinition[];
  private readonly selectedPersonalities: PersonalityId[];
  private spawnedTemplateIds = new Set<number>();
  private eventNodes = new Map<number, TreePosition>();
  private pendingSpawns: PendingEventSpawn[] = [];

  constructor(
    events: GameEventDefinition[] = eventTemplates,
    selectedPersonalities: PersonalityId[] = []
  ) {
    this.events = events;
    this.selectedPersonalities = selectedPersonalities;
  }

  private getTemplateById(id: number): GameEventDefinition | undefined {
    return this.events.find((template) => template.id === id);
  }

  private getBaseTemplates(): GameEventDefinition[] {
    return resolveBaseEvents(this.selectedPersonalities);
  }

  generateInitialEvents(): GameEventInstance[] {
    const baseTemplates = this.getBaseTemplates();

    if (baseTemplates.length === 0) {
      console.warn(
        'EventManager: no base events match the selected personalities.'
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

  spawnChildEvents(
    parent: GameEventInstance,
    templateIds: number[]
  ): GameEventInstance[] {
    if (templateIds.length === 0) return [];

    const parentPosition = this.eventNodes.get(parent.instanceId);
    if (!parentPosition) return [];

    const templatesToSpawn = templateIds
      .filter((id) => !this.spawnedTemplateIds.has(id))
      .map((id) => this.getTemplateById(id))
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
