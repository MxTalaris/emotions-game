import { saveData } from '../api';
import {
  accordionSection,
  button,
  checkboxInput,
  clear,
  el,
  field,
  numberInput,
  openModal,
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
  OUTPUT_PLACED_CARDS,
  PersonalityEntry,
} from '../types';
import { collectPersonalityIds, validateEventSeeds } from '../validate';
import {
  disposeEventsTreeFlows,
  mountEventsTreeFlow,
  type EventsTreeFlowProps,
} from './EventsTreeFlow';

export interface EventsEditorContext {
  getSeeds: () => EventSeedsFile;
  setSeeds: (next: EventSeedsFile) => void;
  getPersonalities: () => PersonalityEntry[];
  getCardAliases: () => string[];
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

const NEW_EVENT_OPTION = '__new__';
const BASIC_FILTER = 'basic';

type BrowseMode = 'list' | 'tree';
type View =
  | { kind: 'browse' }
  | { kind: 'event'; seedIndex: number; eventIndex: number };

let view: View = { kind: 'browse' };
let browseMode: BrowseMode = 'list';
/** Selected personality filter ids. Empty = show all. Use "basic" for empty-personality seeds. */
let personalityFilter: string[] = [];
let eventNameFilter = '';
/** Keeps event form accordions open across re-renders. */
const openEventAccordions = new Set<string>(['base']);

function eventAccordion(
  id: string,
  title: string,
  body: HTMLElement
): HTMLDetailsElement {
  const details = accordionSection(
    title,
    body,
    openEventAccordions.has(id)
  );
  details.dataset.accordionId = id;
  details.addEventListener('toggle', () => {
    if (details.open) openEventAccordions.add(id);
    else openEventAccordions.delete(id);
  });
  return details;
}

function normalizePersonalities(personalities: string[]): string[] {
  return [...new Set(personalities)].sort();
}

function personalitiesKey(personalities: string[]): string {
  return normalizePersonalities(personalities).join('|');
}

function buildSeedId(personalities: string[]): string {
  const normalized = normalizePersonalities(personalities);
  return normalized.length === 0 ? 'basic' : normalized.join('-');
}

function nextEventId(seed: EventSeedDefinition): number {
  const max = seed.events.reduce((m, e) => Math.max(m, e.id), 0);
  return max + 1;
}

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

function createBlankEvent(label: string, id: number): GameEventDefinition {
  return cloneEvent({ id, label, isBase: undefined });
}

function seedMatchesFilter(
  seed: EventSeedDefinition,
  filter: string[]
): boolean {
  if (filter.length === 0) return true;
  const wantsBasic = filter.includes(BASIC_FILTER);
  const personalityIds = filter.filter((id) => id !== BASIC_FILTER);
  if (wantsBasic && personalityIds.length === 0) {
    return seed.personalities.length === 0;
  }
  if (wantsBasic && personalityIds.length > 0) {
    return false;
  }
  return personalityIds.every((id) => seed.personalities.includes(id));
}

interface FlatEventRow {
  seedIndex: number;
  eventIndex: number;
  seed: EventSeedDefinition;
  event: GameEventDefinition;
}

function eventMatchesNameFilter(
  event: GameEventDefinition,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    event.label.toLowerCase().includes(q) ||
    String(event.id).includes(q)
  );
}

function collectFlatEvents(
  file: EventSeedsFile,
  filter: string[],
  nameQuery = eventNameFilter
): FlatEventRow[] {
  const rows: FlatEventRow[] = [];
  file.seeds.forEach((seed, seedIndex) => {
    if (!seedMatchesFilter(seed, filter)) return;
    seed.events.forEach((event, eventIndex) => {
      if (!eventMatchesNameFilter(event, nameQuery)) return;
      rows.push({ seedIndex, eventIndex, seed, event });
    });
  });
  return rows;
}

function stripCreateEventRefs(
  events: GameEventDefinition[],
  deletedId: string
): GameEventDefinition[] {
  return events.map((event) => {
    if (!event.results?.length) return event;
    const results = event.results.map((result) => ({
      ...result,
      actions: result.actions.filter(
        (action) =>
          !(action.type === 'createEvent' && action.event === deletedId)
      ),
    }));
    return { ...event, results };
  });
}

function deleteEvent(
  ctx: EventsEditorContext,
  seedIndex: number,
  eventIndex: number
): void {
  const file = ctx.getSeeds();
  const seed = file.seeds[seedIndex];
  if (!seed) return;
  const target = seed.events[eventIndex];
  if (!target) return;
  const deletedId = String(target.id);
  const remaining = seed.events.filter((_, i) => i !== eventIndex);
  const cleaned = stripCreateEventRefs(remaining, deletedId);
  updateSeed(ctx, seedIndex, { events: cleaned });
}

function findSeedByPersonalities(
  file: EventSeedsFile,
  personalities: string[]
): number {
  const key = personalitiesKey(personalities);
  return file.seeds.findIndex(
    (seed) => personalitiesKey(seed.personalities) === key
  );
}

/** Move event to seed matching personalities; create seed if needed. Returns new indices. */
function moveEventToPersonalities(
  ctx: EventsEditorContext,
  seedIndex: number,
  eventIndex: number,
  personalities: string[]
): { seedIndex: number; eventIndex: number } {
  const normalized = normalizePersonalities(personalities);
  const file = ctx.getSeeds();
  const source = file.seeds[seedIndex];
  if (!source) return { seedIndex, eventIndex };

  if (personalitiesKey(source.personalities) === personalitiesKey(normalized)) {
    return { seedIndex, eventIndex };
  }

  const event = structuredClone(source.events[eventIndex]);
  if (!event) return { seedIndex, eventIndex };

  let seeds = file.seeds.map((seed, si) =>
    si === seedIndex
      ? { ...seed, events: seed.events.filter((_, i) => i !== eventIndex) }
      : seed
  );

  let targetIndex = findSeedByPersonalities({ seeds }, normalized);
  if (targetIndex < 0) {
    seeds = [
      ...seeds,
      {
        id: buildSeedId(normalized),
        personalities: normalized,
        events: [],
      },
    ];
    targetIndex = seeds.length - 1;
  }

  const target = seeds[targetIndex];
  const existingIds = new Set(target.events.map((e) => e.id));
  if (existingIds.has(event.id)) {
    event.id = nextEventId(target);
  }
  seeds = seeds.map((seed, si) =>
    si === targetIndex
      ? { ...seed, events: [...seed.events, event] }
      : seed
  );

  ctx.setSeeds({ seeds });
  return {
    seedIndex: targetIndex,
    eventIndex: seeds[targetIndex].events.length - 1,
  };
}

function promptNewEventLabel(): string | null {
  const label = window.prompt('New event name');
  if (label == null) return null;
  const trimmed = label.trim();
  return trimmed || null;
}

function addEventToSeed(
  ctx: EventsEditorContext,
  seedIndex: number,
  label: string
): { seedIndex: number; eventIndex: number; id: string } {
  const file = ctx.getSeeds();
  const seed = file.seeds[seedIndex];
  if (!seed) {
    throw new Error('Seed not found');
  }
  const id = nextEventId(seed);
  const event = createBlankEvent(label, id);
  updateSeed(ctx, seedIndex, { events: [...seed.events, event] });
  return {
    seedIndex,
    eventIndex: seed.events.length,
    id: String(id),
  };
}

function ensureDefaultSeed(ctx: EventsEditorContext): number {
  const file = ctx.getSeeds();
  if (file.seeds.length > 0) {
    const basic = findSeedByPersonalities(file, []);
    return basic >= 0 ? basic : 0;
  }
  ctx.setSeeds({
    seeds: [{ id: 'basic', personalities: [], events: [] }],
  });
  return 0;
}

async function saveEvents(
  ctx: EventsEditorContext,
  errorsBox: HTMLElement
): Promise<void> {
  const data = ctx.getSeeds();
  const cardAliases = new Set(ctx.getCardAliases());
  const personalityIds = collectPersonalityIds(ctx.getPersonalities());
  const errors = validateEventSeeds(data, cardAliases, personalityIds);
  clear(errorsBox);
  if (errors.length) {
    errorsBox.className = 'errors';
    errorsBox.append(
      el('strong', { text: 'Fix before saving:' }),
      el('ul', {}, ...errors.map((e) => el('li', { text: e })))
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

function eventSelectOptions(
  seed: EventSeedDefinition,
  includeNew = false
): { value: string; label: string }[] {
  const opts = seed.events
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((e) => ({
      value: String(e.id),
      label: `${e.id} - ${e.label}`,
    }));
  if (includeNew) {
    opts.push({ value: NEW_EVENT_OPTION, label: '+ Add new event' });
  }
  return opts;
}

function suitOptions(): { value: string; label: string }[] {
  return ALL_CARD_SUITS.map((s) => ({ value: s, label: s }));
}

function aliasOptions(aliases: string[]): { value: string; label: string }[] {
  return aliases.map((a) => ({ value: a, label: a }));
}

function renderSearchableCardPicker(
  values: string[],
  allAliases: string[],
  onChange: (next: string[]) => void,
  placeholder = 'Search cards…',
  extraOptions: { value: string; label: string }[] = []
): HTMLElement {
  const wrap = el('div', { className: 'card-picker' });
  const chips = el('div', { className: 'chip-list' });
  const search = el('input', {
    type: 'search',
    placeholder,
    className: 'card-picker-search',
  }) as HTMLInputElement;
  const results = el('div', { className: 'card-picker-results' });
  let current = [...values];
  const optionLabel = (value: string) =>
    extraOptions.find((option) => option.value === value)?.label ?? value;

  const renderChips = () => {
    clear(chips);
    current.forEach((value, index) => {
      chips.append(
        el(
          'span',
          { className: 'chip' },
          optionLabel(value),
          button(
            '×',
            () => {
              current = current.filter((_, i) => i !== index);
              onChange(current);
              renderChips();
              renderResults(search.value);
            },
            'btn small'
          )
        )
      );
    });
  };

  const renderResults = (query: string) => {
    clear(results);
    const q = query.toLowerCase().trim();
    const filteredExtras = extraOptions.filter(
      (option) =>
        !current.includes(option.value) &&
        (!q ||
          option.label.toLowerCase().includes(q) ||
          option.value.toLowerCase().includes(q))
    );
    const filtered = allAliases
      .filter(
        (alias) =>
          !current.includes(alias) &&
          (!q || alias.toLowerCase().includes(q))
      )
      .slice(0, Math.max(0, 24 - filteredExtras.length));

    if (filteredExtras.length === 0 && filtered.length === 0) {
      results.append(
        el('div', { className: 'empty', text: 'No cards match.' })
      );
      return;
    }

    for (const option of filteredExtras) {
      results.append(
        button(
          option.label,
          () => {
            current = [...current, option.value];
            onChange(current);
            search.value = '';
            renderChips();
            renderResults('');
          },
          'btn small card-picker-option card-picker-option-special'
        )
      );
    }

    for (const alias of filtered) {
      results.append(
        button(
          alias,
          () => {
            current = [...current, alias];
            onChange(current);
            search.value = '';
            renderChips();
            renderResults('');
          },
          'btn small card-picker-option'
        )
      );
    }
  };

  const stopBubble = (e: Event) => e.stopPropagation();
  wrap.addEventListener('click', stopBubble);
  wrap.addEventListener('mousedown', stopBubble);
  search.addEventListener('click', stopBubble);
  search.addEventListener('mousedown', stopBubble);
  results.addEventListener('click', stopBubble);
  results.addEventListener('mousedown', stopBubble);
  search.addEventListener('input', () => renderResults(search.value));
  renderChips();
  renderResults('');
  wrap.append(chips, search, results);
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
      renderSearchableCardPicker(db.cardEmotions, cardAliases, (next) => {
        setDb({ cardEmotions: next });
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
  seed: EventSeedDefinition,
  seedIndex: number,
  ctx: EventsEditorContext,
  rerender: () => void
): HTMLElement {
  const block = el('div', { className: 'nested' });
  const eventOpts = eventSelectOptions(seed, true);
  const defaultEventId =
    seed.events[0] != null ? String(seed.events[0].id) : '1';

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
          event: defaultEventId,
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
          selectInput(action.event, eventOpts, (v) => {
            if (v === NEW_EVENT_OPTION) {
              const label = promptNewEventLabel();
              if (!label) {
                rerender();
                return;
              }
              const created = addEventToSeed(ctx, seedIndex, label);
              onChange({ ...action, event: created.id });
              rerender();
              return;
            }
            onChange({ ...action, event: v });
          })
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
      renderSearchableCardPicker(emotions, cardAliases, (next) => {
        onChange({
          ...action,
          emotions: next.length === 1 ? next[0] : next,
        });
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
  seed: EventSeedDefinition,
  dealBreakerAliases: string[],
  rerender: () => void
): HTMLElement {
  const section = el('div', { className: 'nested' });
  const defaultEventId =
    seed.events[0] != null ? String(seed.events[0].id) : '1';
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
          seed,
          seedIndex,
          ctx,
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
                event: defaultEventId,
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

const OUTPUT_EMOTION_EXTRA_OPTIONS = [
  { value: OUTPUT_PLACED_CARDS, label: 'input (placed cards)' },
];

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
        renderSearchableCardPicker(output.input.cardEmotions, cardAliases, (next) => {
          setOutput({ input: { type: 'cardEmotions', cardEmotions: next } });
        })
      );
    }

    block.append(
      el('h3', { text: 'Output emotions' }),
      renderSearchableCardPicker(
        emotions,
        cardAliases,
        (next) => {
          setOutput({
            outputEmotions: next.length === 1 ? next[0] : next,
          });
        },
        'Search cards…',
        OUTPUT_EMOTION_EXTRA_OPTIONS
      )
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
    button('Events', () => {
      view = { kind: 'browse' };
      rerender();
    })
  );

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

function renderFilterBar(
  ctx: EventsEditorContext,
  rerender: () => void,
  onNameFilterChange?: () => void
): HTMLElement {
  const personalities = ctx.getPersonalities();
  const wrap = el('div', { className: 'filter-bar' });
  wrap.append(el('span', { className: 'filter-label', text: 'Filter:' }));

  const options = [
    { id: BASIC_FILTER, label: 'basic' },
    ...personalities.map((p) => ({ id: p.id, label: p.name || p.id })),
  ];

  for (const opt of options) {
    const active = personalityFilter.includes(opt.id);
    wrap.append(
      button(
        opt.label,
        () => {
          if (active) {
            personalityFilter = personalityFilter.filter((id) => id !== opt.id);
          } else {
            personalityFilter = [...personalityFilter, opt.id];
          }
          rerender();
        },
        active ? 'btn small primary' : 'btn small'
      )
    );
  }

  if (personalityFilter.length) {
    wrap.append(
      button(
        'Clear',
        () => {
          personalityFilter = [];
          rerender();
        },
        'btn small'
      )
    );
  }

  const search = el('input', {
    type: 'search',
    placeholder: 'Search by name or id…',
    className: 'filter-search',
    value: eventNameFilter,
  }) as HTMLInputElement;

  const clearSearchBtn = button(
    'Clear search',
    () => {
      eventNameFilter = '';
      search.value = '';
      clearSearchBtn.style.display = 'none';
      onNameFilterChange?.();
    },
    'btn small'
  );
  clearSearchBtn.style.display = eventNameFilter.trim() ? '' : 'none';

  search.addEventListener('input', () => {
    eventNameFilter = search.value;
    clearSearchBtn.style.display = search.value.trim() ? '' : 'none';
    onNameFilterChange?.();
  });
  wrap.append(search, clearSearchBtn);

  return wrap;
}

function renderModeToggle(rerender: () => void): HTMLElement {
  return el(
    'div',
    { className: 'mode-toggle' },
    button(
      'List',
      () => {
        browseMode = 'list';
        rerender();
      },
      browseMode === 'list' ? 'btn small primary' : 'btn small'
    ),
    button(
      'Tree',
      () => {
        browseMode = 'tree';
        rerender();
      },
      browseMode === 'tree' ? 'btn small primary' : 'btn small'
    )
  );
}

function confirmDeleteEvent(label: string): boolean {
  return confirm(`Really delete event "${label}"? This cannot be undone until you save.`);
}

function addCreateEventLink(
  ctx: EventsEditorContext,
  seedIndex: number,
  parentEventId: number,
  childEventId: number
): void {
  const seed = ctx.getSeeds().seeds[seedIndex];
  if (!seed) return;
  const eventIndex = seed.events.findIndex((e) => e.id === parentEventId);
  if (eventIndex < 0) return;
  const event = seed.events[eventIndex];
  const results = [...(event.results ?? [])];
  const already = results.some((result) =>
    result.actions.some(
      (action) =>
        action.type === 'createEvent' && action.event === String(childEventId)
    )
  );
  if (already) return;

  if (results.length === 0) {
    results.push({
      type: { type: 'default' },
      outputOverride: false,
      exclusive: false,
      priority: 0,
      actions: [
        {
          type: 'createEvent',
          personality: 'all',
          event: String(childEventId),
          delay: 0,
        },
      ],
    });
  } else {
    const first = results[0];
    results[0] = {
      ...first,
      actions: [
        ...first.actions,
        {
          type: 'createEvent',
          personality: 'all',
          event: String(childEventId),
          delay: 0,
        },
      ],
    };
  }
  updateEvent(ctx, seedIndex, eventIndex, { results });
}

function removeCreateEventLink(
  ctx: EventsEditorContext,
  seedIndex: number,
  parentEventId: number,
  childEventId: number
): void {
  const seed = ctx.getSeeds().seeds[seedIndex];
  if (!seed) return;
  const eventIndex = seed.events.findIndex((e) => e.id === parentEventId);
  if (eventIndex < 0) return;
  const event = seed.events[eventIndex];
  const child = String(childEventId);
  const results = (event.results ?? []).map((result) => ({
    ...result,
    actions: result.actions.filter(
      (action) =>
        !(action.type === 'createEvent' && action.event === child)
    ),
  }));
  updateEvent(ctx, seedIndex, eventIndex, { results });
}

function openEventModal(
  ctx: EventsEditorContext,
  seedIndex: number,
  eventIndex: number,
  parentRerender: () => void
): void {
  const body = el('div');
  const errorsBox = el('div');
  const loc = { seedIndex, eventIndex };
  let closeModal: () => void = () => undefined;

  const modal = openModal(`Edit event`, body, [
    button(
      'Close',
      () => {
        closeModal();
        parentRerender();
      },
      'btn'
    ),
  ]);
  closeModal = modal.close;

  const localRerender = () => {
    clear(body);
    const form = renderEventForm(ctx, loc, errorsBox, () => {
      localRerender();
      parentRerender();
    });
    body.append(form);
  };
  localRerender();
}

function renderTreeView(
  ctx: EventsEditorContext,
  rerender: () => void
): HTMLElement {
  disposeEventsTreeFlows();
  const file = ctx.getSeeds();
  const wrap = el('div', { className: 'tree-view' });
  let any = false;

  file.seeds.forEach((seed, seedIndex) => {
    if (!seedMatchesFilter(seed, personalityFilter)) return;
    any = true;

    const panel = el('div', { className: 'tree-seed-panel' });
    panel.append(
      el('h3', {
        text: `${seed.id} [${seed.personalities.join(', ') || 'basic'}]`,
      })
    );

    const canvas = el('div', { className: 'tree-flow-host' });
    panel.append(canvas);
    wrap.append(panel);

    // Mount after the host is in the document tree (caller appends wrap next).
    // Mount after layout so React Flow gets a non-zero container size.
    requestAnimationFrame(() => {
      const props: EventsTreeFlowProps = {
        seed,
        seedIndex,
        onEditEvent: (si: number, ei: number) =>
          openEventModal(ctx, si, ei, rerender),
        onDeleteEvent: (si: number, ei: number) => {
          const ev = ctx.getSeeds().seeds[si]?.events[ei];
          if (!ev) return;
          if (!confirmDeleteEvent(ev.label)) {
            rerender();
            return;
          }
          deleteEvent(ctx, si, ei);
          rerender();
        },
        onAddEvent: (si: number) => {
          const label = promptNewEventLabel();
          if (!label) return;
          const created = addEventToSeed(ctx, si, label);
          openEventModal(ctx, created.seedIndex, created.eventIndex, rerender);
          rerender();
        },
        onConnectEvents: (si: number, parentId: number, childId: number) => {
          addCreateEventLink(ctx, si, parentId, childId);
        },
        onDisconnectEvents: (
          si: number,
          parentId: number,
          childId: number
        ) => {
          removeCreateEventLink(ctx, si, parentId, childId);
        },
      };
      mountEventsTreeFlow(canvas, props);
    });
  });

  if (!any) {
    wrap.append(
      el('div', {
        className: 'empty',
        text: 'No seeds match the current filter.',
      })
    );
  }

  return wrap;
}

function renderFlatList(
  ctx: EventsEditorContext,
  rerender: () => void
): HTMLElement {
  const rows = collectFlatEvents(ctx.getSeeds(), personalityFilter);
  const list = el('div', { className: 'list' });

  if (rows.length === 0) {
    list.append(
      el('div', { className: 'empty', text: 'No events match the filter.' })
    );
    return list;
  }

  for (const row of rows) {
    const { seed, event, seedIndex, eventIndex } = row;
    list.append(
      el(
        'div',
        { className: 'list-row' },
        el('div', {
          className: 'label',
          text: `${event.isBase ? '★ ' : ''}${event.label}`,
        }),
        el('div', {
          className: 'meta',
          text: `id ${event.id} · seed ${seed.id} · [${seed.personalities.join(', ') || 'basic'}] · energy ${event.energyAmount}`,
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
              id: nextEventId(seed),
              label: `${event.label} (copy)`,
              isBase: undefined,
            });
            updateSeed(ctx, seedIndex, { events: [...seed.events, copy] });
            rerender();
          },
          'btn small'
        ),
        button(
          'Delete',
          () => {
            if (!confirmDeleteEvent(event.label)) return;
            deleteEvent(ctx, seedIndex, eventIndex);
            rerender();
          },
          'btn danger small'
        )
      )
    );
  }

  return list;
}

function refreshBrowseList(
  host: HTMLElement,
  ctx: EventsEditorContext,
  rerender: () => void
): void {
  if (browseMode === 'tree') {
    disposeEventsTreeFlows();
  }
  clear(host);
  host.append(
    browseMode === 'list'
      ? renderFlatList(ctx, rerender)
      : renderTreeView(ctx, rerender)
  );
}

function renderBrowse(
  root: HTMLElement,
  ctx: EventsEditorContext,
  errorsBox: HTMLElement,
  rerender: () => void
): void {
  const toolbar = el(
    'div',
    { className: 'toolbar' },
    renderModeToggle(rerender),
    button(
      'Add event',
      () => {
        const seedIndex = ensureDefaultSeed(ctx);
        const label = promptNewEventLabel();
        if (!label) return;
        const created = addEventToSeed(ctx, seedIndex, label);
        view = {
          kind: 'event',
          seedIndex: created.seedIndex,
          eventIndex: created.eventIndex,
        };
        rerender();
      },
      'btn'
    ),
    button(
      'Save events',
      () => {
        void saveEvents(ctx, errorsBox);
      },
      'btn primary'
    )
  );

  const listHost = el('div', { className: 'events-list-host' });
  const refreshList = () => refreshBrowseList(listHost, ctx, rerender);

  root.append(
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: 'Events' }),
      toolbar,
      renderFilterBar(ctx, rerender, refreshList),
      errorsBox,
      listHost
    )
  );

  refreshList();
}

function renderPersonalityChips(
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
      [
        { value: '', label: '+ add…' },
        ...options
          .filter((o) => !values.includes(o))
          .map((a) => ({ value: a, label: a })),
      ],
      (v) => {
        if (!v) return;
        onChange([...values, v]);
      }
    )
  );
  return wrap;
}

function renderEventForm(
  ctx: EventsEditorContext,
  loc: { seedIndex: number; eventIndex: number },
  errorsBox: HTMLElement,
  rerender: () => void
): HTMLElement {
  const seedIndex = loc.seedIndex;
  const eventIndex = loc.eventIndex;
  const seed = ctx.getSeeds().seeds[seedIndex];
  const event = seed?.events[eventIndex];
  if (!seed || !event) {
    return el('div', { className: 'empty', text: 'Event not found.' });
  }

  const cardAliases = ctx.getCardAliases();
  const personalityIds = ctx.getPersonalities().map((p) => p.id);

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Delete',
      () => {
        if (!confirmDeleteEvent(event.label)) return;
        deleteEvent(ctx, seedIndex, eventIndex);
        view = { kind: 'browse' };
        document.querySelector('.modal-overlay')?.remove();
        rerender();
      },
      'btn danger'
    ),
    button(
      'Save events',
      () => {
        void saveEvents(ctx, errorsBox);
      },
      'btn primary'
    )
  );

  const panel = el('div');
  panel.append(toolbar, errorsBox);

  const baseSection = el('div', { className: 'form-grid' });
  baseSection.append(
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
      checkboxInput(!!event.isBase, (v) => {
        updateEvent(ctx, seedIndex, eventIndex, {
          isBase: v || undefined,
        });
        rerender();
      })
    )
  );

  if (event.isBase) {
    baseSection.append(
      field(
        'Personalities (seed pack)',
        renderPersonalityChips(
          [...seed.personalities],
          personalityIds,
          (next) => {
            const moved = moveEventToPersonalities(
              ctx,
              seedIndex,
              eventIndex,
              next
            );
            loc.seedIndex = moved.seedIndex;
            loc.eventIndex = moved.eventIndex;
            if (view.kind === 'event') {
              view = {
                kind: 'event',
                seedIndex: moved.seedIndex,
                eventIndex: moved.eventIndex,
              };
            }
            rerender();
          }
        ),
        true
      ),
      el('div', {
        className: 'meta',
        text: `Current seed: ${seed.id}`,
      })
    );
  }

  panel.append(eventAccordion('base', 'Base fields', baseSection));

  const liveSeed = ctx.getSeeds().seeds[loc.seedIndex];
  const liveEvent = liveSeed?.events[loc.eventIndex];
  if (!liveSeed || !liveEvent) {
    return panel;
  }

  panel.append(
    eventAccordion(
      'modifiers',
      'Modifiers',
      renderModifiersSection(
        liveEvent,
        loc.seedIndex,
        loc.eventIndex,
        ctx,
        cardAliases,
        rerender
      )
    ),
    eventAccordion(
      'deal-breakers',
      'Deal breakers',
      renderDealBreakersSection(
        liveEvent,
        loc.seedIndex,
        loc.eventIndex,
        ctx,
        cardAliases,
        rerender
      )
    ),
    eventAccordion(
      'results',
      'Results',
      renderResultsSection(
        liveEvent,
        loc.seedIndex,
        loc.eventIndex,
        ctx,
        cardAliases,
        personalityIds,
        liveSeed,
        (liveEvent.dealBreakers ?? []).map((d) => d.alias),
        rerender
      )
    ),
    eventAccordion(
      'outputs',
      'Outputs',
      renderOutputsSection(
        liveEvent,
        loc.seedIndex,
        loc.eventIndex,
        ctx,
        cardAliases,
        rerender
      )
    )
  );

  return panel;
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
    view = { kind: 'browse' };
    rerender();
    return;
  }

  const loc = { seedIndex, eventIndex };
  root.append(
    renderBreadcrumb(ctx, rerender),
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: `Event #${event.id}` }),
      renderEventForm(ctx, loc, errorsBox, () => {
        if (view.kind === 'event') {
          view = {
            kind: 'event',
            seedIndex: loc.seedIndex,
            eventIndex: loc.eventIndex,
          };
        }
        rerender();
      })
    )
  );
}

export function renderEventsEditor(
  root: HTMLElement,
  ctx: EventsEditorContext
): void {
  disposeEventsTreeFlows();
  const rerender = () => renderEventsEditor(root, ctx);
  clear(root);
  const errorsBox = el('div');

  if (view.kind === 'browse') {
    renderBrowse(root, ctx, errorsBox, rerender);
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

/** Reset navigation when leaving the Events tab. */
export function resetEventsView(): void {
  disposeEventsTreeFlows();
  view = { kind: 'browse' };
  browseMode = 'list';
  personalityFilter = [];
  eventNameFilter = '';
  openEventAccordions.clear();
  openEventAccordions.add('base');
}
