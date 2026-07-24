import { saveData } from '../api';
import {
  button,
  clear,
  el,
  field,
  textInput,
} from '../dom';
import { PersonalityEntry } from '../types';
import { validatePersonalities } from '../validate';

export interface PersonalitiesEditorContext {
  getPersonalities: () => PersonalityEntry[];
  setPersonalities: (next: PersonalityEntry[]) => void;
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

export function renderPersonalitiesEditor(
  root: HTMLElement,
  ctx: PersonalitiesEditorContext
): void {
  clear(root);

  const personalities = ctx.getPersonalities();
  const errorsBox = el('div');

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button('Add personality', () => {
      const next = [
        ...ctx.getPersonalities(),
        { id: `personality-${Date.now()}`, name: 'New personality' },
      ];
      ctx.setPersonalities(next);
      ctx.onChanged();
      renderPersonalitiesEditor(root, ctx);
    }, 'btn primary'),
    button('Save personalities', async () => {
      const data = ctx.getPersonalities();
      const errors = validatePersonalities(data);
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
        await saveData('personalities-catalog', data);
        ctx.setStatus('Personalities saved', 'ok');
      } catch (err) {
        ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
      }
    }, 'btn primary')
  );

  const list = el('div', { className: 'list' });

  if (personalities.length === 0) {
    list.append(el('div', { className: 'empty', text: 'No personalities yet.' }));
  }

  personalities.forEach((p, index) => {
    const row = el('div', { className: 'list-row' });
    row.append(
      field(
        'ID',
        textInput(p.id, (v) => {
          const next = ctx.getPersonalities().map((item, i) =>
            i === index ? { ...item, id: v } : item
          );
          ctx.setPersonalities(next);
        })
      ),
      field(
        'Name',
        textInput(p.name, (v) => {
          const next = ctx.getPersonalities().map((item, i) =>
            i === index ? { ...item, name: v } : item
          );
          ctx.setPersonalities(next);
        })
      ),
      button(
        'Remove',
        () => {
          const next = ctx.getPersonalities().filter((_, i) => i !== index);
          ctx.setPersonalities(next);
          ctx.onChanged();
          renderPersonalitiesEditor(root, ctx);
        },
        'btn danger small'
      )
    );
    list.append(row);
  });

  root.append(
    el('div', { className: 'panel' }, el('h2', { text: 'Personalities' }), toolbar, errorsBox, list)
  );
}
