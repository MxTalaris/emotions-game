import { saveData } from '../api';
import {
  button,
  checkboxInput,
  clear,
  el,
  field,
  numberInput,
  selectInput,
  textInput,
} from '../dom';
import {
  ALL_CARD_SUITS,
  DealBreaker,
  EventAction,
  EventOutput,
  EventOutputInput,
  EventResult,
  EventResultType,
  EventSeedDefinition,
  EventSeedsFile,
  GameEventDefinition,
  PersonalityEntry,
} from '../types';
import { collectPersonalityIds, validateEventSeeds } from '../validate';

export interface EventsEditorContext {
  getSeeds: () => EventSeedsFile;
  setSeeds: (next: EventSeedsFile) => void;
  getPersonalities: () => PersonalityEntry[];
  getCardAliases: () => string[];
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

type View =
  | { kind: 'seeds' }
  | { kind: 'seed'; seedIndex: number }
  | { kind: 'event'; seedIndex: number; eventIndex: number };

let view: View = { kind: 'seeds' };

function cloneEvent(base?: Partial<GameEventDefinition>): GameEventDefinition {
  return {
    id: base?.id ?? Date.now() % 100000,
    label: base?.label ?? 'New event',
    energyAmount: base?.energyAmount ?? 30,
    energyAmountSecret: base?.energyAmountSecret ?? false,
    cardsPerTurn: base?.cardsPerTurn ?? 1,
    autoComplete: base?.autoComplete ?? 0,
    autoCompleteSecret: base?.autoCompleteSecret ?? false,
    cardsRequired: base?.cardsRequired ?? true,
    isBase: base?.isBase,
    modifiers: base?.modifiers ? structuredClone(base.modifiers) : undefined,
    dealBreakers: base?.dealBreakers
      ? structuredClone(base.dealBreakers)
      : [],
    results: base?.results ? structuredClone(base.results) : [],
    outputs: base?.outputs ? structuredClone(base.outputs) : [],
  };
}

function updateSeed(
  ctx: EventsEditorContext,
  seedIndex: number,
  patch: Partial<EventSeedDefinition>
): void {
  const file = ctx.getSeeds();
  const seeds = file.seeds.map((s, i) =>
    i === seedIndex ? { ...s, ...patch } : s
  );
  ctx.setSeeds({ seeds });
}

function updateEvent(
  ctx: EventsEditorContext,
  seedIndex: number,
  eventIndex: number,
  patch: Partial<GameEventDefinition> | ((e: GameEventDefinition) => GameEventDefinition)
): void {
  const file = ctx.getSeeds();
  const seeds = file.seeds.map((seed, si) => {
    if (si !== seedIndex) return seed;
    const events = seed.events.map((event, ei) => {
      if (ei !== eventIndex) return event;
      return typeof patch === 'function' ? patch(event) : { ...event, ...patch };
    });
    return { ...seed, events };
  });
  ctx.setSeeds({ seeds });
}

function suitOptions(): { value: string; label: string }[] {
  return ALL_CARD_SUITS.map((s) => ({ value: s, label: s }));
}

function aliasOptions(aliases: string[]): { value: string; label: string }[] {
  return aliases.map((a) => ({ value: a, label: a }));
}

function renderChipList(
  values: string[],
  options: string[],
  onChange: (next: string[]) => void
): HTMLElement {
  const wrap = el('div', { className: 'chip-list' });
  values.forEach((value, index) => {
    wrap.append(
      el(
        'span',
        { className: 'chip' },
        value,
        button(
          '×',
          () => onChange(values.filter((_, i) => i !== index)),
          'btn small'
        )
      )
    );
  });
  wrap.append(
    selectInput(
      '',
      [{ value: '', label: '+ add…' }, ...aliasOptions(options)],
      (v) => {
        if (!v) return;
        onChange([...values, v]);
      }
    )
  );
  return wrap;
}

function renderSuitQuantityList(
  items: { suitId: string; quantity: number }[],
  onChange: (next: { suitId: string; quantity: number }[]) => void
): HTMLElement {
  const wrap = el('div', { className: 'kv-list' });
  items.forEach((item, index) => {
    wrap.append(
      el(
        'div',
        { className: 'kv-row' },
        selectInput(item.suitId, suitOptions(), (v) => {
          const next = items.map((it, i) =>
            i === index ? { ...it, suitId: v as typeof it.suitId } : it
          );
          onChange(next);
        }),
        numberInput(item.quantity, (v) => {
          const next = items.map((it, i) =>
            i === index ? { ...it, quantity: v } : it
          );
          onChange(next);
        }),
        button(
          '×',
          () => onChange(items.filter((_, i) => i !== index)),
          'btn small danger'
        )
      )
    );
  });
  wrap.append(
    button(
      'Add suit quantity',
      () => onChange([...items, { suitId: 'joy', quantity: 1 }]),
      'btn small'
    )
  );
  return wrap;
}

function renderSuitEnergyList(
  items: { suitId: string; total: number }[],
  onChange: (next: { suitId: string; total: number }[]) => void
): HTMLElement {
  const wrap = el('div', { className: 'kv-list' });
  items.forEach((item, index) => {
    wrap.append(
      el(
        'div',
        { className: 'kv-row' },
        selectInput(item.suitId, suitOptions(), (v) => {
          const next = items.map((it, i) =>
            i === index ? { ...it, suitId: v as typeof it.suitId } : it
          );
          onChange(next);
        }),
        numberInput(item.total, (v) => {
          const next = items.map((it, i) =>
            i === index ? { ...it, total: v } : it
          );
          onChange(next);
        }),
        button(
          '×',
          () => onChange(items.filter((_, i) => i !== index)),
          'btn small danger'
        )
      )
    );
  });
  wrap.append(
    button(
      'Add suit energy',
      () => onChange([...items, { suitId: 'joy', total: 10 }]),
      'btn small'
    )
  );
  return wrap;
}

function renderModifiersSection(
  event: GameEventDefinition,
  seedIndex: number,
  eventIndex: number,
  ctx: EventsEditorContext,
  cardAliases: string[],
  rerender: () => void
): HTMLElement {
  const modifiers = event.modifiers ?? { suits: {}, cards: {} };
  const suitEntries = Object.entries(modifiers.suits ?? {});
  const cardEntries = Object.entries(modifiers.cards ?? {});

  const section = el('div', { className: 'nested' });
  section.append(
    el('div', { className: 'nested-header' }, el('span', { className: 'title', text: 'Modifiers' }))
  );

  const suitsList = el('div', { className: 'kv-list' });
  suitEntries.forEach(([suit, mult], index) => {
    const multiplier = mult ?? 1;
    suitsList.append(
      el(
        'div',
        { className: 'kv-row' },
        selectInput(suit, suitOptions(), (v) => {
          updateEvent(ctx, seedIndex, eventIndex, (e) => {
            const suits = { ...(e.modifiers?.suits ?? {}) };
            const entries = Object.entries(suits);
            const next: Record<string, number> = {};
            entries.forEach(([k, val], i) => {
              next[i === index ? v : k] = val ?? 1;
            });
            return { ...e, modifiers: { ...e.modifiers, suits: next } };
          });
          rerender();
        }),
        numberInput(multiplier, (v) => {
          updateEvent(ctx, seedIndex, eventIndex, (e) => {
            const suits = { ...(e.modifiers?.suits ?? {}) };
            const keys = Object.keys(suits);
            const key = keys[index];
            if (key) suits[key] = v;
            return { ...e, modifiers: { ...e.modifiers, suits } };
          });
        }),
        button(
          '×',
          () => {
            updateEvent(ctx, seedIndex, eventIndex, (e) => {
              const suits = { ...(e.modifiers?.suits ?? {}) };
              const keys = Object.keys(suits);
              const key = keys[index];
              if (key) delete suits[key];
              return { ...e, modifiers: { ...e.modifiers, suits } };
            });
            rerender();
          },
          'btn small danger'
        )
      )
    );
  });
  suitsList.append(
    button(
      'Add suit modifier',
      () => {
        updateEvent(ctx, seedIndex, eventIndex, (e) => ({
          ...e,
          modifiers: {
            ...e.modifiers,
            suits: { ...(e.modifiers?.suits ?? {}), joy: 1.5 },
          },
        }));
        rerender();
      },
      'btn small'
    )
  );

  const cardsList = el('div', { className: 'kv-list' });
  cardEntries.forEach(([alias, mult], index) => {
    const multiplier = mult ?? 1;
    cardsList.append(
      el(
        'div',
        { className: 'kv-row' },
        selectInput(alias, aliasOptions(cardAliases), (v) => {
          updateEvent(ctx, seedIndex, eventIndex, (e) => {
            const cards = { ...(e.modifiers?.cards ?? {}) };
            const entries = Object.entries(cards);
            const next: Record<string, number> = {};
            entries.forEach(([k, val], i) => {
              next[i === index ? v : k] = val ?? 1;
            });
            return { ...e, modifiers: { ...e.modifiers, cards: next } };
          });
          rerender();
        }),
        numberInput(multiplier, (v) => {
          updateEvent(ctx, seedIndex, eventIndex, (e) => {
            const cards = { ...(e.modifiers?.cards ?? {}) };
            const keys = Object.keys(cards);
            const key = keys[index];
            if (key) cards[key] = v;
            return { ...e, modifiers: { ...e.modifiers, cards } };
          });
        }),
        button(
          '×',
          () => {
            updateEvent(ctx, seedIndex, eventIndex, (e) => {
              const cards = { ...(e.modifiers?.cards ?? {}) };
              const keys = Object.keys(cards);
              const key = keys[index];
              if (key) delete cards[key];
              return { ...e, modifiers: { ...e.modifiers, cards } };
            });
            rerender();
          },
          'btn small danger'
        )
      )
    );
  });
  cardsList.append(
    button(
      'Add card modifier',
      () => {
        const first = cardAliases[0] ?? 'joy-basic';
        updateEvent(ctx, seedIndex, eventIndex, (e) => ({
          ...e,
          modifiers: {
            ...e.modifiers,
            cards: { ...(e.modifiers?.cards ?? {}), [first]: 0.5 },
          },
        }));
        rerender();
      },
      'btn small'
    )
  );

  section.append(
    el('h3', { text: 'By suit' }),
    suitsList,
    el('h3', { text: 'By card alias' }),
    cardsList
  );
  return section;
}

function renderDealBreakersSection(
  event: GameEventDefinition,
  seedIndex: number,
  eventIndex: number,
  ctx: EventsEditorContext,
  cardAliases: string[],
  rerender: () => void
): HTMLElement {
  const section = el('div', { className: 'nested' });
  section.append(
    el(
      'div',
      { className: 'nested-header' },
      el('span', { className: 'title', text: 'Deal breakers' }),
      button(
        'Add deal breaker',
        () => {
          const list = [...(event.dealBreakers ?? [])];
          const nextId = (list.reduce((m, d) => Math.max(m, d.id), 0) || 0) + 1;
          list.push({
            id: nextId,
            alias: `dealbreaker-${nextId}`,
            suitQuantities: [],
            suitEnergies: [],
            cardEmotions: [],
          });
          updateEvent(ctx, seedIndex, eventIndex, { dealBreakers: list });
          rerender();
        },
        'btn small'
      )
    )
  );

  const list = event.dealBreakers ?? [];
  if (list.length === 0) {
    section.append(el('div', { className: 'empty', text: 'No deal breakers.' }));
  }

  list.forEach((db, di) => {
    const block = el('div', { className: 'nested' });
    const setDb = (patch: Partial<DealBreaker>) => {
      const next = list.map((item, i) => (i === di ? { ...item, ...patch } : item));
      updateEvent(ctx, seedIndex, eventIndex, { dealBreakers: next });
    };
    block.append(
      el(
        'div',
        { className: 'nested-header' },
        el('span', { className: 'title', text: `#${db.id} ${db.alias}` }),
        button(
          'Remove',
          () => {
            updateEvent(ctx, seedIndex, eventIndex, {
              dealBreakers: list.filter((_, i) => i !== di),
            });
            rerender();
          },
          'btn danger small'
        )
      ),
      el(
        'div',
        { className: 'form-grid' },
        field(
          'ID',
          numberInput(db.id, (v) => {
            setDb({ id: v });
          })
        ),
        field(
          'Alias',
          textInput(db.alias, (v) => setDb({ alias: v }))
        )
      ),
      el('h3', { text: 'Suit quantities' }),
      renderSuitQuantityList(db.suitQuantities, (next) => {
        setDb({ suitQuantities: next as DealBreaker['suitQuantities'] });
        rerender();
      }),
      el('h3', { text: 'Suit energies' }),
      renderSuitEnergyList(db.suitEnergies, (next) => {
        setDb({ suitEnergies: next as DealBreaker['suitEnergies'] });
        rerender();
      }),
      el('h3', { text: 'Card emotions' }),
      renderChipList(db.cardEmotions, cardAliases, (next) => {
        setDb({ cardEmotions: next });
        rerender();
      })
    );
    section.append(block);
  });

  return section;
}

function defaultResultType(type: EventResultType['type']): EventResultType {
  if (type === 'default') return { type: 'default' };
  return { type, parameters: '' };
}

function renderActionEditor(
  action: EventAction,
  onChange: (next: EventAction) => void,
  onRemove: () => void,
  cardAliases: string[],
  personalityIds: string[],
  eventIds: string[],
  rerender: () => void
): HTMLElement {
  const block = el('div', { className: 'nested' });
  const typeSelect = selectInput(
    action.type,
    [
      { value: 'createEvent', label: 'createEvent' },
      { value: 'createEmotion', label: 'createEmotion' },
      { value: 'generatePersonality', label: 'generatePersonality' },
      { value: 'endGame', label: 'endGame' },
    ],
    (v) => {
      if (v === 'createEvent') {
        onChange({
          type: 'createEvent',
          personality: 'all',
          event: eventIds[0] ?? '1',
          delay: 0,
        });
      } else if (v === 'createEmotion') {
        onChange({
          type: 'createEmotion',
          emotions: cardAliases[0] ?? 'joy-basic',
        });
      } else if (v === 'generatePersonality') {
        onChange({
          type: 'generatePersonality',
          personality: personalityIds[0] ?? 'warm',
        });
      } else {
        onChange({ type: 'endGame' });
      }
      rerender();
    }
  );

  block.append(
    el(
      'div',
      { className: 'nested-header' },
      el('span', { className: 'title', text: 'Action' }),
      button('Remove', onRemove, 'btn danger small')
    ),
    field('Type', typeSelect)
  );

  if (action.type === 'createEvent') {
    const personalityOpts = [
      { value: 'all', label: 'all' },
      { value: 'basic', label: 'basic' },
      ...personalityIds.map((id) => ({ value: id, label: id })),
    ];
    block.append(
      el(
        'div',
        { className: 'form-grid' },
        field(
          'Personality',
          selectInput(action.personality, personalityOpts, (v) =>
            onChange({ ...action, personality: v })
          )
        ),
        field(
          'Event id',
          selectInput(
            action.event,
            eventIds.map((id) => ({ value: id, label: id })),
            (v) => onChange({ ...action, event: v })
          )
        ),
        field(
          'Delay',
          numberInput(action.delay, (v) => onChange({ ...action, delay: v }))
        )
      )
    );
  } else if (action.type === 'createEmotion') {
    const emotions = Array.isArray(action.emotions)
      ? action.emotions
      : [action.emotions];
    block.append(
      el('h3', { text: 'Emotions' }),
      renderChipList(emotions, cardAliases, (next) => {
        onChange({
          ...action,
          emotions: next.length === 1 ? next[0] : next,
        });
        rerender();
      })
    );
  } else if (action.type === 'generatePersonality') {
    block.append(
      field(
        'Personality',
        selectInput(
          action.personality,
          personalityIds.map((id) => ({ value: id, label: id })),
          (v) => onChange({ ...action, personality: v })
        )
      )
    );
  }

  return block;
}

function renderResultsSection(
  event: GameEventDefinition,
  seedIndex: number,
  eventIndex: number,
  ctx: EventsEditorContext,
  cardAliases: string[],
  personalityIds: string[],
  eventIds: string[],
  dealBreakerAliases: string[],
  rerender: () => void
): HTMLElement {
  const section = el('div', { className: 'nested' });
  section.append(
    el(
      'div',
      { className: 'nested-header' },
      el('span', { className: 'title', text: 'Results' }),
      button(
        'Add result',
        () => {
          const list = [...(event.results ?? [])];
          list.push({
            type: { type: 'default' },
            outputOverride: false,
            exclusive: false,
            priority: 0,
            actions: [],
          });
          updateEvent(ctx, seedIndex, eventIndex, { results: list });
          rerender();
        },
        'btn small'
      )
    )
  );

  const list = event.results ?? [];
  if (list.length === 0) {
    section.append(el('div', { className: 'empty', text: 'No results.' }));
  }

  list.forEach((result, ri) => {
    const block = el('div', { className: 'nested' });
    const setResult = (patch: Partial<EventResult>) => {
      const next = list.map((item, i) =>
        i === ri ? { ...item, ...patch } : item
      );
      updateEvent(ctx, seedIndex, eventIndex, { results: next });
    };

    const typeValue = result.type.type;
    block.append(
      el(
        'div',
        { className: 'nested-header' },
        el('span', { className: 'title', text: `Result ${ri + 1}` }),
        button(
          'Remove',
          () => {
            updateEvent(ctx, seedIndex, eventIndex, {
              results: list.filter((_, i) => i !== ri),
            });
            rerender();
          },
          'btn danger small'
        )
      ),
      el(
        'div',
        { className: 'form-grid' },
        field(
          'Type',
          selectInput(
            typeValue,
            [
              { value: 'default', label: 'default' },
              { value: 'dealbreaker', label: 'dealbreaker' },
              { value: 'majority', label: 'majority' },
              { value: 'specific', label: 'specific' },
            ],
            (v) => {
              setResult({
                type: defaultResultType(v as EventResultType['type']),
              });
              rerender();
            }
          )
        ),
        field(
          'Exclusive',
          checkboxInput(result.exclusive, (v) => setResult({ exclusive: v }))
        ),
        field(
          'Output override',
          checkboxInput(result.outputOverride, (v) =>
            setResult({ outputOverride: v })
          )
        ),
        field(
          'Priority',
          numberInput(result.priority, (v) => setResult({ priority: v }))
        )
      )
    );

    if (result.type.type === 'dealbreaker') {
      block.append(
        field(
          'Deal breaker alias',
          selectInput(
            result.type.parameters,
            [
              { value: '', label: '—' },
              ...dealBreakerAliases.map((a) => ({ value: a, label: a })),
            ],
            (v) => setResult({ type: { type: 'dealbreaker', parameters: v } })
          )
        )
      );
    } else if (result.type.type === 'majority') {
      block.append(
        field(
          'Majority suit',
          selectInput(
            result.type.parameters || 'joy',
            suitOptions(),
            (v) => setResult({ type: { type: 'majority', parameters: v } })
          )
        )
      );
    } else if (result.type.type === 'specific') {
      block.append(
        field(
          'Specific card',
          selectInput(
            result.type.parameters || cardAliases[0] || '',
            aliasOptions(cardAliases),
            (v) => setResult({ type: { type: 'specific', parameters: v } })
          )
        )
      );
    }

    const actionsWrap = el('div');
    actionsWrap.append(el('h3', { text: 'Actions' }));
    result.actions.forEach((action, ai) => {
      actionsWrap.append(
        renderActionEditor(
          action,
          (next) => {
            const actions = result.actions.map((a, i) => (i === ai ? next : a));
            setResult({ actions });
          },
          () => {
            setResult({
              actions: result.actions.filter((_, i) => i !== ai),
            });
            rerender();
          },
          cardAliases,
          personalityIds,
          eventIds,
          rerender
        )
      );
    });
    actionsWrap.append(
      button(
        'Add action',
        () => {
          setResult({
            actions: [
              ...result.actions,
              {
                type: 'createEvent',
                personality: 'all',
                event: eventIds[0] ?? '1',
                delay: 0,
              },
            ],
          });
          rerender();
        },
        'btn small'
      )
    );
    block.append(actionsWrap);
    section.append(block);
  });

  return section;
}

function defaultOutputInput(type: EventOutputInput['type']): EventOutputInput {
  if (type === 'default') return { type: 'default' };
  if (type === 'suitQuantities') return { type: 'suitQuantities', suitQuantities: [] };
  if (type === 'suitEnergies') return { type: 'suitEnergies', suitEnergies: [] };
  return { type: 'cardEmotions', cardEmotions: [] };
}

function renderOutputsSection(
  event: GameEventDefinition,
  seedIndex: number,
  eventIndex: number,
  ctx: EventsEditorContext,
  cardAliases: string[],
  rerender: () => void
): HTMLElement {
  const section = el('div', { className: 'nested' });
  section.append(
    el(
      'div',
      { className: 'nested-header' },
      el('span', { className: 'title', text: 'Outputs' }),
      button(
        'Add output',
        () => {
          const list = [...(event.outputs ?? [])];
          list.push({
            input: { type: 'default' },
            exclusive: false,
            priority: 0,
            outputEmotions: cardAliases[0] ?? 'joy-basic',
          });
          updateEvent(ctx, seedIndex, eventIndex, { outputs: list });
          rerender();
        },
        'btn small'
      )
    )
  );

  const list = event.outputs ?? [];
  if (list.length === 0) {
    section.append(el('div', { className: 'empty', text: 'No outputs.' }));
  }

  list.forEach((output, oi) => {
    const block = el('div', { className: 'nested' });
    const setOutput = (patch: Partial<EventOutput>) => {
      const next = list.map((item, i) =>
        i === oi ? { ...item, ...patch } : item
      );
      updateEvent(ctx, seedIndex, eventIndex, { outputs: next });
    };

    const emotions = Array.isArray(output.outputEmotions)
      ? output.outputEmotions
      : [output.outputEmotions];

    block.append(
      el(
        'div',
        { className: 'nested-header' },
        el('span', { className: 'title', text: `Output ${oi + 1}` }),
        button(
          'Remove',
          () => {
            updateEvent(ctx, seedIndex, eventIndex, {
              outputs: list.filter((_, i) => i !== oi),
            });
            rerender();
          },
          'btn danger small'
        )
      ),
      el(
        'div',
        { className: 'form-grid' },
        field(
          'Input type',
          selectInput(
            output.input.type,
            [
              { value: 'default', label: 'default' },
              { value: 'suitQuantities', label: 'suitQuantities' },
              { value: 'suitEnergies', label: 'suitEnergies' },
              { value: 'cardEmotions', label: 'cardEmotions' },
            ],
            (v) => {
              setOutput({
                input: defaultOutputInput(v as EventOutputInput['type']),
              });
              rerender();
            }
          )
        ),
        field(
          'Exclusive',
          checkboxInput(output.exclusive, (v) => setOutput({ exclusive: v }))
        ),
        field(
          'Priority',
          numberInput(output.priority, (v) => setOutput({ priority: v }))
        )
      )
    );

    if (output.input.type === 'suitQuantities') {
      block.append(
        el('h3', { text: 'Suit quantities' }),
        renderSuitQuantityList(output.input.suitQuantities, (next) => {
          setOutput({
            input: {
              type: 'suitQuantities',
              suitQuantities: next as DealBreaker['suitQuantities'],
            },
          });
          rerender();
        })
      );
    } else if (output.input.type === 'suitEnergies') {
      block.append(
        el('h3', { text: 'Suit energies' }),
        renderSuitEnergyList(output.input.suitEnergies, (next) => {
          setOutput({
            input: {
              type: 'suitEnergies',
              suitEnergies: next as DealBreaker['suitEnergies'],
            },
          });
          rerender();
        })
      );
    } else if (output.input.type === 'cardEmotions') {
      block.append(
        el('h3', { text: 'Card emotions' }),
        renderChipList(output.input.cardEmotions, cardAliases, (next) => {
          setOutput({ input: { type: 'cardEmotions', cardEmotions: next } });
          rerender();
        })
      );
    }

    block.append(
      el('h3', { text: 'Output emotions' }),
      renderChipList(emotions, cardAliases, (next) => {
        setOutput({
          outputEmotions: next.length === 1 ? next[0] : next,
        });
        rerender();
      })
    );

    section.append(block);
  });

  return section;
}

function renderBreadcrumb(
  ctx: EventsEditorContext,
  rerender: () => void
): HTMLElement {
  const crumbs = el('div', { className: 'breadcrumb' });
  crumbs.append(
    button('Seeds', () => {
      view = { kind: 'seeds' };
      rerender();
    })
  );

  if (view.kind === 'seed' || view.kind === 'event') {
    const seed = ctx.getSeeds().seeds[view.seedIndex];
    crumbs.append(
      el('span', { className: 'sep', text: '/' }),
      button(seed?.id ?? 'seed', () => {
        if (view.kind === 'seed' || view.kind === 'event') {
          view = { kind: 'seed', seedIndex: view.seedIndex };
          rerender();
        }
      })
    );
  }

  if (view.kind === 'event') {
    const event =
      ctx.getSeeds().seeds[view.seedIndex]?.events[view.eventIndex];
    crumbs.append(
      el('span', { className: 'sep', text: '/' }),
      el('span', {
        text: event ? `#${event.id} ${event.label}` : 'event',
      })
    );
  }

  return crumbs;
}

function renderSeedsList(
  root: HTMLElement,
  ctx: EventsEditorContext,
  errorsBox: HTMLElement,
  rerender: () => void
): void {
  const file = ctx.getSeeds();
  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Add seed',
      () => {
        const seeds = [
          ...file.seeds,
          { id: `seed-${Date.now()}`, personalities: [], events: [] },
        ];
        ctx.setSeeds({ seeds });
        rerender();
      },
      'btn'
    ),
    button(
      'Save events',
      async () => {
        const data = ctx.getSeeds();
        const cardAliases = new Set(ctx.getCardAliases());
        const personalityIds = collectPersonalityIds(ctx.getPersonalities());
        const errors = validateEventSeeds(data, cardAliases, personalityIds);
        clear(errorsBox);
        if (errors.length) {
          errorsBox.className = 'errors';
          errorsBox.append(
            el('strong', { text: 'Fix before saving:' }),
            el(
              'ul',
              {},
              ...errors.map((e) => el('li', { text: e }))
            )
          );
          ctx.setStatus('Validation failed', 'err');
          return;
        }
        try {
          await saveData('event-templates', data);
          ctx.setStatus('Events saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const list = el('div', { className: 'list' });
  file.seeds.forEach((seed, index) => {
    list.append(
      el(
        'div',
        { className: 'list-row' },
        el('div', {
          className: 'label',
          text: seed.id,
        }),
        el('div', {
          className: 'meta',
          text: `${seed.events.length} events · personalities: [${seed.personalities.join(', ')}]`,
        }),
        button(
          'Open',
          () => {
            view = { kind: 'seed', seedIndex: index };
            rerender();
          },
          'btn small primary'
        ),
        button(
          'Remove',
          () => {
            if (!confirm(`Remove seed "${seed.id}"?`)) return;
            ctx.setSeeds({
              seeds: file.seeds.filter((_, i) => i !== index),
            });
            rerender();
          },
          'btn danger small'
        )
      )
    );
  });

  root.append(
    el('div', { className: 'panel' }, el('h2', { text: 'Event seeds' }), toolbar, errorsBox, list)
  );
}

function renderSeedDetail(
  root: HTMLElement,
  ctx: EventsEditorContext,
  seedIndex: number,
  errorsBox: HTMLElement,
  rerender: () => void
): void {
  const seed = ctx.getSeeds().seeds[seedIndex];
  if (!seed) {
    view = { kind: 'seeds' };
    rerender();
    return;
  }

  const personalityIds = ctx.getPersonalities().map((p) => p.id);

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Add event',
      () => {
        const events = [...seed.events, cloneEvent()];
        updateSeed(ctx, seedIndex, { events });
        rerender();
      },
      'btn primary'
    ),
    button(
      'Save events',
      async () => {
        const data = ctx.getSeeds();
        const cardAliases = new Set(ctx.getCardAliases());
        const pids = collectPersonalityIds(ctx.getPersonalities());
        const errors = validateEventSeeds(data, cardAliases, pids);
        clear(errorsBox);
        if (errors.length) {
          errorsBox.className = 'errors';
          errorsBox.append(
            el('strong', { text: 'Fix before saving:' }),
            el(
              'ul',
              {},
              ...errors.map((e) => el('li', { text: e }))
            )
          );
          ctx.setStatus('Validation failed', 'err');
          return;
        }
        try {
          await saveData('event-templates', data);
          ctx.setStatus('Events saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const form = el(
    'div',
    { className: 'form-grid' },
    field(
      'Seed ID',
      textInput(seed.id, (v) => updateSeed(ctx, seedIndex, { id: v }))
    ),
    field(
      'Personalities',
      renderChipList(seed.personalities, personalityIds, (next) => {
        updateSeed(ctx, seedIndex, { personalities: next });
        rerender();
      }),
      true
    )
  );

  const list = el('div', { className: 'list' });
  if (seed.events.length === 0) {
    list.append(el('div', { className: 'empty', text: 'No events in this seed.' }));
  }
  seed.events.forEach((event, eventIndex) => {
    list.append(
      el(
        'div',
        { className: 'list-row' },
        el('div', {
          className: 'label',
          text: `${event.label}`,
        }),
        el('div', {
          className: 'meta',
          text: `id ${event.id} · energy ${event.energyAmount}`,
        }),
        button(
          'Edit',
          () => {
            view = { kind: 'event', seedIndex, eventIndex };
            rerender();
          },
          'btn small primary'
        ),
        button(
          'Duplicate',
          () => {
            const copy = cloneEvent({
              ...event,
              id: event.id + 1000,
              label: `${event.label} (copy)`,
            });
            updateSeed(ctx, seedIndex, { events: [...seed.events, copy] });
            rerender();
          },
          'btn small'
        ),
        button(
          'Remove',
          () => {
            if (!confirm(`Remove event "${event.label}"?`)) return;
            updateSeed(ctx, seedIndex, {
              events: seed.events.filter((_, i) => i !== eventIndex),
            });
            rerender();
          },
          'btn danger small'
        )
      )
    );
  });

  root.append(
    renderBreadcrumb(ctx, rerender),
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: `Seed: ${seed.id}` }),
      toolbar,
      errorsBox,
      form,
      el('h3', { text: 'Events' }),
      list
    )
  );
}

function renderEventDetail(
  root: HTMLElement,
  ctx: EventsEditorContext,
  seedIndex: number,
  eventIndex: number,
  errorsBox: HTMLElement,
  rerender: () => void
): void {
  const seed = ctx.getSeeds().seeds[seedIndex];
  const event = seed?.events[eventIndex];
  if (!seed || !event) {
    view = { kind: 'seeds' };
    rerender();
    return;
  }

  const cardAliases = ctx.getCardAliases();
  const personalityIds = ctx.getPersonalities().map((p) => p.id);
  const eventIds = [
    ...new Set(
      ctx.getSeeds().seeds.flatMap((s) => s.events.map((e) => String(e.id)))
    ),
  ].sort((a, b) => Number(a) - Number(b));
  const dealBreakerAliases = (event.dealBreakers ?? []).map((d) => d.alias);

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Save events',
      async () => {
        const data = ctx.getSeeds();
        const errors = validateEventSeeds(
          data,
          new Set(cardAliases),
          collectPersonalityIds(ctx.getPersonalities())
        );
        clear(errorsBox);
        if (errors.length) {
          errorsBox.className = 'errors';
          errorsBox.append(
            el('strong', { text: 'Fix before saving:' }),
            el(
              'ul',
              {},
              ...errors.map((e) => el('li', { text: e }))
            )
          );
          ctx.setStatus('Validation failed', 'err');
          return;
        }
        try {
          await saveData('event-templates', data);
          ctx.setStatus('Events saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const baseForm = el(
    'div',
    { className: 'form-grid' },
    field(
      'ID',
      numberInput(event.id, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { id: v })
      )
    ),
    field(
      'Label',
      textInput(event.label, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { label: v })
      )
    ),
    field(
      'Energy amount',
      numberInput(event.energyAmount, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { energyAmount: v })
      )
    ),
    field(
      'Energy secret',
      checkboxInput(event.energyAmountSecret, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { energyAmountSecret: v })
      )
    ),
    field(
      'Cards per turn',
      numberInput(event.cardsPerTurn, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { cardsPerTurn: v })
      )
    ),
    field(
      'Auto complete (turns)',
      numberInput(event.autoComplete, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { autoComplete: v })
      )
    ),
    field(
      'Auto complete secret',
      checkboxInput(event.autoCompleteSecret, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { autoCompleteSecret: v })
      )
    ),
    field(
      'Cards required',
      checkboxInput(event.cardsRequired, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { cardsRequired: v })
      )
    ),
    field(
      'Is base',
      checkboxInput(!!event.isBase, (v) =>
        updateEvent(ctx, seedIndex, eventIndex, { isBase: v || undefined })
      )
    )
  );

  root.append(
    renderBreadcrumb(ctx, rerender),
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: `Event #${event.id}` }),
      toolbar,
      errorsBox,
      el('h3', { text: 'Base fields' }),
      baseForm,
      renderModifiersSection(
        event,
        seedIndex,
        eventIndex,
        ctx,
        cardAliases,
        rerender
      ),
      renderDealBreakersSection(
        event,
        seedIndex,
        eventIndex,
        ctx,
        cardAliases,
        rerender
      ),
      renderResultsSection(
        event,
        seedIndex,
        eventIndex,
        ctx,
        cardAliases,
        personalityIds,
        eventIds,
        dealBreakerAliases,
        rerender
      ),
      renderOutputsSection(
        event,
        seedIndex,
        eventIndex,
        ctx,
        cardAliases,
        rerender
      )
    )
  );
}

export function renderEventsEditor(
  root: HTMLElement,
  ctx: EventsEditorContext
): void {
  const rerender = () => renderEventsEditor(root, ctx);
  clear(root);
  const errorsBox = el('div');

  if (view.kind === 'seeds') {
    renderSeedsList(root, ctx, errorsBox, rerender);
  } else if (view.kind === 'seed') {
    renderSeedDetail(root, ctx, view.seedIndex, errorsBox, rerender);
  } else {
    renderEventDetail(
      root,
      ctx,
      view.seedIndex,
      view.eventIndex,
      errorsBox,
      rerender
    );
  }
}

/** Reset navigation when leaving the Events tab (optional). */
export function resetEventsView(): void {
  view = { kind: 'seeds' };
}
