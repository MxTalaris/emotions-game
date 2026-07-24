import { saveData } from '../api';
import {
  button,
  clear,
  el,
  field,
  numberInput,
  selectInput,
  textInput,
} from '../dom';
import {
  ALL_CARD_SUITS,
  EmotionCatalogEntry,
  EmotionsCatalog,
} from '../types';
import { collectCardAliases, validateEmotionsCatalog } from '../validate';

export interface CardsEditorContext {
  getCatalog: () => EmotionsCatalog;
  setCatalog: (next: EmotionsCatalog) => void;
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

function ensureSuit(catalog: EmotionsCatalog, suit: string): EmotionsCatalog {
  if (catalog[suit]) return catalog;
  return {
    ...catalog,
    [suit]: { color: '#888888', cards: [] },
  };
}

function updateCard(
  catalog: EmotionsCatalog,
  suit: string,
  index: number,
  patch: Partial<EmotionCatalogEntry>
): EmotionsCatalog {
  const group = catalog[suit];
  if (!group) return catalog;
  const cards = group.cards.map((card, i) =>
    i === index ? { ...card, ...patch } : card
  );
  return { ...catalog, [suit]: { ...group, cards } };
}

function renderFadedEmotions(
  card: EmotionCatalogEntry,
  allAliases: string[],
  onChange: (next: string[] | null) => void
): HTMLElement {
  const wrap = el('div', { className: 'chip-list' });
  const current = card.fadedEmotion ?? [];

  for (let i = 0; i < current.length; i++) {
    const alias = current[i];
    wrap.append(
      el(
        'span',
        { className: 'chip' },
        alias,
        button(
          '×',
          () => {
            const next = current.filter((_, fi) => fi !== i);
            onChange(next.length ? next : null);
          },
          'btn small'
        )
      )
    );
  }

  const addSelect = selectInput(
    '',
    [
      { value: '', label: '+ add faded…' },
      ...allAliases.map((a) => ({ value: a, label: a })),
    ],
    (v) => {
      if (!v) return;
      onChange([...current, v]);
    }
  );
  wrap.append(addSelect);

  wrap.append(
    button(
      'Clear',
      () => onChange(null),
      'btn small'
    )
  );

  return wrap;
}

export function renderCardsEditor(
  root: HTMLElement,
  ctx: CardsEditorContext
): void {
  clear(root);

  let catalog = ctx.getCatalog();
  const errorsBox = el('div');
  const allAliases = [...collectCardAliases(catalog)].sort();

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Save cards',
      async () => {
        const data = ctx.getCatalog();
        const errors = validateEmotionsCatalog(data);
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
          await saveData('emotions-catalog', data);
          ctx.setStatus('Cards saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const content = el('div');

  for (const suit of ALL_CARD_SUITS) {
    catalog = ensureSuit(catalog, suit);
    const group = catalog[suit];

    const suitBlock = el('div', { className: 'suit-block panel' });
    const colorInput = el('input', {
      type: 'color',
      value: group.color || '#888888',
    }) as HTMLInputElement;
    colorInput.value = group.color || '#888888';
    colorInput.addEventListener('input', () => {
      const next = {
        ...ctx.getCatalog(),
        [suit]: { ...ctx.getCatalog()[suit], color: colorInput.value },
      };
      ctx.setCatalog(next);
    });

    const header = el(
      'div',
      { className: 'suit-header' },
      el('h3', { text: suit }),
      el('div', {
        className: 'color-swatch',
        style: `background:${group.color}`,
      }),
      field('Color', colorInput),
      button(
        'Add card',
        () => {
          const current = ensureSuit(ctx.getCatalog(), suit);
          const cards = [
            ...current[suit].cards,
            {
              id: `${suit}-new-${Date.now()}`,
              name: 'New card',
              energy: 10,
              duration: 0,
              fadedEmotion: null,
            },
          ];
          ctx.setCatalog({
            ...current,
            [suit]: { ...current[suit], cards },
          });
          ctx.onChanged();
          renderCardsEditor(root, ctx);
        },
        'btn small'
      )
    );

    const list = el('div', { className: 'list' });
    group.cards.forEach((card, index) => {
      const row = el('div', { className: 'list-row' });
      const form = el('div', { className: 'form-grid' });
      form.append(
        field(
          'ID',
          textInput(card.id, (v) => {
            ctx.setCatalog(updateCard(ctx.getCatalog(), suit, index, { id: v }));
          })
        ),
        field(
          'Name',
          textInput(card.name, (v) => {
            ctx.setCatalog(
              updateCard(ctx.getCatalog(), suit, index, { name: v })
            );
          })
        ),
        field(
          'Energy',
          numberInput(card.energy, (v) => {
            ctx.setCatalog(
              updateCard(ctx.getCatalog(), suit, index, { energy: v })
            );
          })
        ),
        field(
          'Duration',
          numberInput(card.duration, (v) => {
            ctx.setCatalog(
              updateCard(ctx.getCatalog(), suit, index, { duration: v })
            );
          })
        ),
        field(
          'Faded emotions',
          renderFadedEmotions(card, allAliases, (next) => {
            ctx.setCatalog(
              updateCard(ctx.getCatalog(), suit, index, {
                fadedEmotion: next,
              })
            );
            ctx.onChanged();
            renderCardsEditor(root, ctx);
          }),
          true
        )
      );
      row.append(
        form,
        button(
          'Remove',
          () => {
            const current = ctx.getCatalog();
            const cards = current[suit].cards.filter((_, i) => i !== index);
            ctx.setCatalog({
              ...current,
              [suit]: { ...current[suit], cards },
            });
            ctx.onChanged();
            renderCardsEditor(root, ctx);
          },
          'btn danger small'
        )
      );
      list.append(row);
    });

    suitBlock.append(header, list);
    content.append(suitBlock);
  }

  // Persist ensured suits if any were missing
  if (JSON.stringify(catalog) !== JSON.stringify(ctx.getCatalog())) {
    ctx.setCatalog(catalog);
  }

  root.append(toolbar, errorsBox, content);
}
