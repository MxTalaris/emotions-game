import {
  CardSuit,
  EventResult,
  GameEventInstance,
} from '../types';
import { getSuitCounts } from './resolveDealBreakers';

function matchesMajority(event: GameEventInstance, suit: string): boolean {
  const counts = getSuitCounts(event);
  const target = suit as CardSuit;
  const targetCount = counts.get(target) ?? 0;
  if (targetCount <= 0) return false;

  for (const [otherSuit, count] of counts) {
    if (otherSuit === target) continue;
    if (count >= targetCount) return false;
  }
  return true;
}

/**
 * Validates a result only for an event that is completing (completionCause set).
 */
export function matchesEventResult(
  event: GameEventInstance,
  result: EventResult
): boolean {
  if (!event.completed && !event.completionCause) {
    return false;
  }

  const { type } = result;

  switch (type.type) {
    case 'default':
      return true;
    case 'dealbreaker':
      return (
        event.completionCause === 'dealBreaker' &&
        event.matchedDealBreakerAlias === type.parameters
      );
    case 'majority':
      return matchesMajority(event, type.parameters);
    case 'specific':
      return event.placedCardAliases.includes(type.parameters);
    default:
      return false;
  }
}

/**
 * Selects which results fire while an event is concluding after Sentir.
 * Exclusive rules mirror outputs: any exclusive wins → highest priority exclusive only.
 */
export function selectEventResults(event: GameEventInstance): EventResult[] {
  if (!event.completionCause) return [];

  const results = event.results ?? [];
  const valid = results.filter((result) => matchesEventResult(event, result));
  if (valid.length === 0) return [];

  const exclusives = valid.filter((result) => result.exclusive);
  if (exclusives.length === 0) return valid;

  const winner = exclusives.reduce((best, result) =>
    result.priority > best.priority ? result : best
  );
  return [winner];
}

export function shouldOverrideOutputsFromResults(
  results: EventResult[]
): boolean {
  return results.some((result) => result.outputOverride);
}
