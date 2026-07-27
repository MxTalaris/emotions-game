import {
  EmotionsCatalog,
  EventAction,
  EventSeedsFile,
  PersonalityEntry,
} from './types';

export function collectCardAliases(catalog: EmotionsCatalog): Set<string> {
  const aliases = new Set<string>();
  for (const group of Object.values(catalog)) {
    for (const card of group.cards) {
      aliases.add(card.id);
    }
  }
  return aliases;
}

export function collectPersonalityIds(
  personalities: PersonalityEntry[]
): Set<string> {
  return new Set(personalities.map((p) => p.id));
}

export function collectEventIds(seeds: EventSeedsFile): Set<string> {
  const ids = new Set<string>();
  for (const seed of seeds.seeds) {
    for (const event of seed.events) {
      ids.add(String(event.id));
    }
  }
  return ids;
}

export function collectSeedEventIds(
  seed: EventSeedsFile['seeds'][number]
): Set<string> {
  return new Set(seed.events.map((event) => String(event.id)));
}

function asAliasList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

export function validatePersonalities(
  personalities: PersonalityEntry[]
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  personalities.forEach((p, index) => {
    const path = `personalities[${index}]`;
    if (!p.id?.trim()) {
      errors.push(`${path}: id is required`);
    } else if (seen.has(p.id)) {
      errors.push(`${path}: duplicate id "${p.id}"`);
    } else {
      seen.add(p.id);
    }
    if (!p.name?.trim()) {
      errors.push(`${path}: name is required`);
    }
  });

  return errors;
}

export function validateEmotionsCatalog(catalog: EmotionsCatalog): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const allAliases = collectCardAliases(catalog);

  for (const [suit, group] of Object.entries(catalog)) {
    if (!group.color?.trim()) {
      errors.push(`${suit}: color is required`);
    }
    group.cards.forEach((card, index) => {
      const path = `${suit}.cards[${index}]`;
      if (!card.id?.trim()) {
        errors.push(`${path}: id is required`);
      } else if (seen.has(card.id)) {
        errors.push(`${path}: duplicate card id "${card.id}"`);
      } else {
        seen.add(card.id);
      }
      if (!card.name?.trim()) {
        errors.push(`${path}: name is required`);
      }
      if (typeof card.energy !== 'number' || Number.isNaN(card.energy)) {
        errors.push(`${path}: energy must be a number`);
      }
      if (typeof card.duration !== 'number' || Number.isNaN(card.duration)) {
        errors.push(`${path}: duration must be a number`);
      }
      if (card.fadedEmotion) {
        card.fadedEmotion.forEach((alias, fi) => {
          if (!allAliases.has(alias)) {
            errors.push(
              `${path}.fadedEmotion[${fi}]: unknown card alias "${alias}"`
            );
          }
        });
      }
    });
  }

  if (!catalog.apathy?.cards?.some((c) => c.id === 'apathy-basic')) {
    errors.push('apathy suit must include card "apathy-basic"');
  }

  return errors;
}

function validateAction(
  action: EventAction,
  path: string,
  cardAliases: Set<string>,
  personalityIds: Set<string>,
  eventIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (action.type === 'createEvent') {
    if (!action.event?.trim()) {
      errors.push(`${path}: createEvent.event is required`);
    } else if (!eventIds.has(action.event)) {
      errors.push(
        `${path}: createEvent.event "${action.event}" not found in this seed`
      );
    }
    const ref = action.personality;
    if (!ref) {
      errors.push(`${path}: createEvent.personality is required`);
    } else if (ref !== 'all' && ref !== 'basic' && !personalityIds.has(ref)) {
      errors.push(
        `${path}: createEvent.personality "${ref}" is not a valid ref`
      );
    }
  } else if (action.type === 'createEmotion') {
    for (const alias of asAliasList(action.emotions)) {
      if (!cardAliases.has(alias)) {
        errors.push(`${path}: unknown emotion alias "${alias}"`);
      }
    }
  } else if (action.type === 'generatePersonality') {
    if (!personalityIds.has(action.personality)) {
      errors.push(
        `${path}: generatePersonality "${action.personality}" not in catalog`
      );
    }
  }

  return errors;
}

export function validateEventSeeds(
  seedsFile: EventSeedsFile,
  cardAliases: Set<string>,
  personalityIds: Set<string>
): string[] {
  const errors: string[] = [];
  const seedIds = new Set<string>();

  seedsFile.seeds.forEach((seed, si) => {
    const seedPath = `seeds[${si}] (${seed.id || '?'})`;
    if (!seed.id?.trim()) {
      errors.push(`${seedPath}: seed id is required`);
    } else if (seedIds.has(seed.id)) {
      errors.push(`${seedPath}: duplicate seed id "${seed.id}"`);
    } else {
      seedIds.add(seed.id);
    }

    seed.personalities.forEach((pid, pi) => {
      if (!personalityIds.has(pid)) {
        errors.push(
          `${seedPath}.personalities[${pi}]: unknown personality "${pid}"`
        );
      }
    });

    const seedEventIds = collectSeedEventIds(seed);
    const eventIdSeen = new Set<number>();
    seed.events.forEach((event, ei) => {
      const path = `${seedPath}.events[${ei}]`;
      if (typeof event.id !== 'number' || Number.isNaN(event.id)) {
        errors.push(`${path}: id must be a number`);
      } else if (eventIdSeen.has(event.id)) {
        errors.push(`${path}: duplicate event id ${event.id} in this seed`);
      } else {
        eventIdSeen.add(event.id);
      }
      if (!event.label?.trim()) {
        errors.push(`${path}: label is required`);
      }

      if (event.modifiers?.cards) {
        for (const alias of Object.keys(event.modifiers.cards)) {
          if (!cardAliases.has(alias)) {
            errors.push(`${path}.modifiers.cards: unknown alias "${alias}"`);
          }
        }
      }

      event.dealBreakers?.forEach((db, di) => {
        const dbPath = `${path}.dealBreakers[${di}]`;
        if (!db.alias?.trim()) {
          errors.push(`${dbPath}: alias is required`);
        }
        db.cardEmotions.forEach((alias, ai) => {
          if (!cardAliases.has(alias)) {
            errors.push(`${dbPath}.cardEmotions[${ai}]: unknown "${alias}"`);
          }
        });
      });

      event.results?.forEach((result, ri) => {
        const rPath = `${path}.results[${ri}]`;
        if (result.type.type === 'dealbreaker' && !result.type.parameters) {
          errors.push(`${rPath}: dealbreaker parameters (alias) required`);
        }
        if (
          (result.type.type === 'majority' || result.type.type === 'specific') &&
          !result.type.parameters
        ) {
          errors.push(`${rPath}: parameters required for ${result.type.type}`);
        }
        result.actions.forEach((action, ai) => {
          errors.push(
            ...validateAction(
              action,
              `${rPath}.actions[${ai}]`,
              cardAliases,
              personalityIds,
              seedEventIds
            )
          );
        });
      });

      event.outputs?.forEach((output, oi) => {
        const oPath = `${path}.outputs[${oi}]`;
        if (output.input.type === 'cardEmotions') {
          output.input.cardEmotions.forEach((alias, ai) => {
            if (!cardAliases.has(alias)) {
              errors.push(`${oPath}.input.cardEmotions[${ai}]: unknown "${alias}"`);
            }
          });
        }
        for (const alias of asAliasList(output.outputEmotions)) {
          if (!cardAliases.has(alias)) {
            errors.push(`${oPath}.outputEmotions: unknown "${alias}"`);
          }
        }
      });
    });
  });

  return errors;
}
