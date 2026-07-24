import { EventCircle } from '../entities/EventCircle';
import { findMatchingDealBreaker } from './resolveDealBreakers';
import { EventCompletionCause } from '../types';

export function findEventsWithFeelingsThisTurn(events: EventCircle[]): EventCircle[] {
  return events.filter(
    (event) =>
      !event.eventData.completed && event.eventData.cardsPlacedThisTurn > 0
  );
}

export function findEventsReadyToProcess(events: EventCircle[]): EventCircle[] {
  return events.filter(
    (event) =>
      !event.eventData.completed &&
      event.eventData.progress >= event.eventData.energyAmount
  );
}

export function findEventsDueForAutoComplete(events: EventCircle[]): EventCircle[] {
  return events.filter((event) => event.shouldAutoComplete());
}

export interface PendingEventCompletion {
  event: EventCircle;
  cause: EventCompletionCause;
  dealBreakerAlias?: string;
}

/**
 * Events that will conclude during this Sentir (before turn tick).
 * Auto-complete uses turnsAlive + 1 to mirror the upcoming tickTurn.
 */
export function findEventsCompletingThisSentir(
  events: EventCircle[]
): PendingEventCompletion[] {
  const pending: PendingEventCompletion[] = [];

  for (const event of events) {
    if (event.eventData.completed) continue;

    const dealBreaker = findMatchingDealBreaker(event.eventData);
    if (dealBreaker) {
      pending.push({
        event,
        cause: 'dealBreaker',
        dealBreakerAlias: dealBreaker.alias,
      });
      continue;
    }

    if (event.eventData.progress >= event.eventData.energyAmount) {
      pending.push({ event, cause: 'energy' });
      continue;
    }

    const autoComplete = event.eventData.autoComplete;
    if (
      autoComplete > 0 &&
      event.eventData.turnsAlive + 1 >= autoComplete
    ) {
      pending.push({ event, cause: 'autoComplete' });
    }
  }

  return pending;
}
