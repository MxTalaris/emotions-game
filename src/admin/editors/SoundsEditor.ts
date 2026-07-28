import { saveData, uploadSoundFile } from '../api';
import {
  button,
  clear,
  el,
  field,
  numberInput,
} from '../dom';
import {
  createEmptySoundsCatalog,
  SOUND_ACTION_IDS,
  SOUND_ACTION_LABELS,
  SOUND_BGM_ID,
  SoundActionId,
  SoundsCatalog,
} from '../types';
import { validateSoundsCatalog } from '../validate';

export interface SoundsEditorContext {
  getCatalog: () => SoundsCatalog;
  setCatalog: (next: SoundsCatalog) => void;
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

function updateAction(
  catalog: SoundsCatalog,
  id: SoundActionId,
  patch: Partial<SoundsCatalog[SoundActionId]>
): SoundsCatalog {
  return {
    ...catalog,
    [id]: { ...catalog[id], ...patch },
  };
}

function renderAudioField(
  id: SoundActionId,
  catalog: SoundsCatalog,
  ctx: SoundsEditorContext,
  root: HTMLElement
): HTMLElement {
  const entry = catalog[id];
  const isBgm = id === SOUND_BGM_ID;
  const wrap = el('div', { className: 'chip-list' });

  if (entry.path) {
    wrap.append(
      el('audio', {
        className: 'audio-preview',
        src: entry.path,
        controls: true,
        loop: isBgm,
      }) as HTMLAudioElement
    );
    wrap.append(
      el('span', {
        className: 'chip',
        text: entry.path,
      })
    );
  } else if (isBgm) {
    wrap.append(
      el('span', {
        className: 'empty',
        text: 'Som padrão do jogo (assets/audio/bgm-sirens.mp3)',
      })
    );
  } else {
    wrap.append(
      el('span', {
        className: 'empty',
        text: 'Sem som (silencioso)',
      })
    );
  }

  const fileInput = el('input', {
    type: 'file',
    accept: 'audio/mpeg,audio/ogg,audio/wav,audio/mp4,.mp3,.ogg,.wav,.m4a',
  }) as HTMLInputElement;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      ctx.setStatus('Uploading…');
      const path = await uploadSoundFile(id, file);
      ctx.setCatalog(updateAction(ctx.getCatalog(), id, { path }));
      ctx.setStatus('Sound uploaded (remember to Save sounds)', 'ok');
      ctx.onChanged();
      renderSoundsEditor(root, ctx);
    } catch (err) {
      ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
    }
  });

  wrap.append(
    fileInput,
    button(
      isBgm ? 'Restore default' : 'Clear sound',
      () => {
        ctx.setCatalog(updateAction(ctx.getCatalog(), id, { path: null }));
        ctx.onChanged();
        renderSoundsEditor(root, ctx);
      },
      'btn small'
    )
  );

  return wrap;
}

export function renderSoundsEditor(
  root: HTMLElement,
  ctx: SoundsEditorContext
): void {
  clear(root);

  const catalog = {
    ...createEmptySoundsCatalog(),
    ...ctx.getCatalog(),
  };
  const errorsBox = el('div');

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Save sounds',
      async () => {
        const data = ctx.getCatalog();
        const errors = validateSoundsCatalog(data);
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
          await saveData('sounds-catalog', data);
          ctx.setStatus('Sounds saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const list = el('div', { className: 'list' });

  for (const id of SOUND_ACTION_IDS) {
    const entry = catalog[id];
    const isBgm = id === SOUND_BGM_ID;
    const row = el('div', { className: 'list-row sound-row' });
    row.append(
      el('div', { className: 'sound-meta' },
        el('strong', { text: SOUND_ACTION_LABELS[id] }),
        el('span', { className: 'chip', text: id }),
        ...(isBgm
          ? [el('span', { className: 'chip', text: 'loop' })]
          : [])
      ),
      field(
        'Volume (0–1)',
        numberInput(entry.volume, (v) => {
          ctx.setCatalog(
            updateAction(ctx.getCatalog(), id, {
              volume: Math.min(1, Math.max(0, v)),
            })
          );
        }, { min: '0', max: '1', step: '0.05' })
      ),
      field(
        'Audio file',
        renderAudioField(id, catalog, ctx, root),
        true
      )
    );
    list.append(row);
  }

  root.append(
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: 'Sounds' }),
      el('p', {
        className: 'sub',
        text: 'Upload SFX for game actions and replace background music. Empty SFX path = no sound. Empty BGM = default track.',
      }),
      toolbar,
      errorsBox,
      list
    )
  );
}
