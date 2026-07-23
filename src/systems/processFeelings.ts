import { EventCircle } from '../entities/EventCircle';

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
