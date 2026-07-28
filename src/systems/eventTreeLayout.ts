import { EVENT_TREE } from '../config/gameConfig';
import { GameEventDefinition, GameEventInstance } from '../types';

export interface TreePosition {
  x: number;
  y: number;
  depth: number;
}

let nextEventInstanceId = 1;

export function createEventInstance(
  template: GameEventDefinition,
  position: TreePosition,
  parentInstanceId?: number
): GameEventInstance {
  return {
    ...template,
    instanceId: nextEventInstanceId++,
    x: position.x,
    y: position.y,
    width: EVENT_TREE.width,
    height: EVENT_TREE.height,
    depth: position.depth,
    parentInstanceId,
    placedCardAliases: [],
    thisTurnPlacedCardAliases: [],
    progress: 0,
    cardsPlacedThisTurn: 0,
    turnsAlive: 0,
    completed: false,
  };
}

export function layoutBaseEvents(count: number): TreePosition[] {
  const { centerX, baseY } = EVENT_TREE;

  if (count <= 0) return [];

  if (count === 1) {
    return [{ x: centerX, y: baseY, depth: 0 }];
  }

  const spacing = Math.max(EVENT_TREE.baseSpacing, EVENT_TREE.minNodeDistance);
  const totalWidth = (count - 1) * spacing;
  const startX = centerX - totalWidth / 2;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * spacing,
    y: baseY,
    depth: 0,
  }));
}

export function layoutChildEvents(
  parent: TreePosition,
  childCount: number
): TreePosition[] {
  if (childCount <= 0) return [];

  const y = parent.y - EVENT_TREE.levelSpacing;
  const depth = parent.depth + 1;
  const spacing = Math.max(EVENT_TREE.branchSpacing, EVENT_TREE.minNodeDistance);

  if (childCount === 1) {
    return [{ x: parent.x, y, depth }];
  }

  const totalWidth = (childCount - 1) * spacing;
  const startX = parent.x - totalWidth / 2;

  return Array.from({ length: childCount }, (_, index) => ({
    x: startX + index * spacing,
    y,
    depth,
  }));
}

function isSameLevel(aY: number, bY: number): boolean {
  return Math.abs(aY - bY) < EVENT_TREE.levelSpacing * 0.5;
}

function groupClearsBlockers(
  xs: number[],
  blockers: number[],
  minDist: number
): boolean {
  return xs.every((x) => blockers.every((blocker) => Math.abs(x - blocker) >= minDist));
}

function findClearHorizontalShift(
  xs: number[],
  blockers: number[],
  minDist: number
): number {
  if (blockers.length === 0 || groupClearsBlockers(xs, blockers, minDist)) {
    return 0;
  }

  const step = 4;
  const maxShift = 2400;

  for (let shift = step; shift <= maxShift; shift += step) {
    if (groupClearsBlockers(
      xs.map((x) => x + shift),
      blockers,
      minDist
    )) {
      return shift;
    }
    if (groupClearsBlockers(
      xs.map((x) => x - shift),
      blockers,
      minDist
    )) {
      return -shift;
    }
  }

  const rightmostBlocker = Math.max(...blockers);
  return rightmostBlocker + minDist - Math.min(...xs);
}

/**
 * Positions children under a parent, shifting the whole sibling group
 * horizontally when needed so nodes on the same level do not overlap.
 */
export function layoutChildEventsWithoutOverlap(
  parent: TreePosition,
  childCount: number,
  occupied: TreePosition[]
): TreePosition[] {
  const proposed = layoutChildEvents(parent, childCount);
  if (proposed.length === 0) return [];

  const minDist = EVENT_TREE.minNodeDistance;
  const y = proposed[0].y;
  const blockers = occupied
    .filter((node) => isSameLevel(node.y, y))
    .map((node) => node.x);

  const xs = proposed.map((position) => position.x);
  const shift = findClearHorizontalShift(xs, blockers, minDist);

  return proposed.map((position) => ({
    ...position,
    x: position.x + shift,
  }));
}
