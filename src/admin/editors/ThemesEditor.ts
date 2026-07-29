import { saveData, uploadSoundFile, uploadThemeBackground } from '../api';
import {
  accordionSection,
  button,
  clear,
  el,
  field,
  numberInput,
  selectInput,
  textInput,
} from '../dom';
import {
  createEmptySoundsCatalog,
  SOUND_ACTION_IDS,
  SOUND_ACTION_LABELS,
  SOUND_BGM_ID,
  SoundActionId,
  SoundsCatalog,
  THEME_BACKGROUND_KEYS,
  THEME_BACKGROUND_LABELS,
  THEME_BORDER_KEYS,
  THEME_BORDER_LABELS,
  THEME_BUTTON_KEYS,
  THEME_BUTTON_LABELS,
  ThemeBorders,
  ThemeButtons,
  ThemeEntry,
  ThemesCatalogFile,
} from '../types';
import { validateThemesCatalog } from '../validate';

export interface ThemesEditorContext {
  getCatalog: () => ThemesCatalogFile;
  setCatalog: (next: ThemesCatalogFile) => void;
  setStatus: (message: string, kind?: 'ok' | 'err' | 'warn') => void;
  onChanged: () => void;
}

function updateTheme(
  catalog: ThemesCatalogFile,
  index: number,
  patch: Partial<ThemeEntry>
): ThemesCatalogFile {
  const themes = catalog.themes.map((theme, i) =>
    i === index ? { ...theme, ...patch } : theme
  );
  return { ...catalog, themes };
}

function updateThemeSounds(
  catalog: ThemesCatalogFile,
  index: number,
  soundId: SoundActionId,
  patch: Partial<SoundsCatalog[SoundActionId]>
): ThemesCatalogFile {
  const theme = catalog.themes[index];
  if (!theme) return catalog;
  return updateTheme(catalog, index, {
    sounds: {
      ...createEmptySoundsCatalog(),
      ...theme.sounds,
      [soundId]: { ...theme.sounds[soundId], ...patch },
    },
  });
}

function syncBordersToEventColors(theme: ThemeEntry): ThemeEntry {
  return {
    ...theme,
    eventColors: {
      ...theme.eventColors,
      stroke: theme.borders.stroke,
      ready: theme.borders.ready,
      connector: theme.borders.connector,
      completedStroke: theme.borders.completedStroke,
      fill: theme.borders.fill,
    },
  };
}

function colorInput(
  value: string,
  onChange: (v: string) => void
): HTMLElement {
  const wrap = el('div', { className: 'theme-color-input' });
  const picker = el('input', {
    type: 'color',
    value: value.startsWith('#') ? value : `#${value}`,
  }) as HTMLInputElement;
  const text = textInput(value, onChange);
  picker.addEventListener('input', () => onChange(picker.value));
  text.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
      picker.value = text.value;
    }
  });
  wrap.append(picker, text);
  return wrap;
}

function colorField(
  label: string,
  value: string,
  onChange: (v: string) => void
): HTMLElement {
  return field(label, colorInput(value, onChange));
}

function renderSoundField(
  themeIndex: number,
  soundId: SoundActionId,
  catalog: ThemesCatalogFile,
  ctx: ThemesEditorContext,
  root: HTMLElement
): HTMLElement {
  const theme = catalog.themes[themeIndex];
  const entry = theme.sounds[soundId];
  const isBgm = soundId === SOUND_BGM_ID;
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
    wrap.append(el('span', { className: 'chip', text: entry.path }));
  } else if (isBgm) {
    wrap.append(
      el('span', {
        className: 'empty',
        text: 'Som padrão do jogo (assets/audio/bgm-sirens.mp3)',
      })
    );
  } else {
    wrap.append(
      el('span', { className: 'empty', text: 'Sem som (silencioso)' })
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
      const path = await uploadSoundFile(`${theme.alias}-${soundId}`, file);
      ctx.setCatalog(
        updateThemeSounds(ctx.getCatalog(), themeIndex, soundId, { path })
      );
      ctx.setStatus('Sound uploaded (remember to Save themes)', 'ok');
      ctx.onChanged();
      renderThemesEditor(root, ctx);
    } catch (err) {
      ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
    }
  });

  wrap.append(
    fileInput,
    button(
      isBgm ? 'Restore default' : 'Clear sound',
      () => {
        ctx.setCatalog(
          updateThemeSounds(ctx.getCatalog(), themeIndex, soundId, {
            path: null,
          })
        );
        ctx.onChanged();
        renderThemesEditor(root, ctx);
      },
      'btn small'
    )
  );

  return wrap;
}

function renderBackgroundField(
  themeIndex: number,
  catalog: ThemesCatalogFile,
  ctx: ThemesEditorContext,
  root: HTMLElement
): HTMLElement {
  const theme = catalog.themes[themeIndex];
  const wrap = el('div', { className: 'chip-list' });

  if (theme.background.image) {
    wrap.append(
      el('img', {
        className: 'image-preview',
        src: theme.background.image,
        alt: `${theme.name} background`,
      }) as HTMLImageElement
    );
    wrap.append(
      el('span', { className: 'chip', text: theme.background.image })
    );
  } else {
    wrap.append(
      el('span', {
        className: 'empty',
        text: 'Gradiente (sem imagem)',
      })
    );
  }

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/webp,image/gif',
  }) as HTMLInputElement;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      ctx.setStatus('Uploading…');
      const path = await uploadThemeBackground(theme.alias, file);
      const next = updateTheme(ctx.getCatalog(), themeIndex, {
        background: { ...theme.background, image: path },
      });
      ctx.setCatalog(next);
      ctx.setStatus('Background uploaded (remember to Save themes)', 'ok');
      ctx.onChanged();
      renderThemesEditor(root, ctx);
    } catch (err) {
      ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
    }
  });

  wrap.append(
    fileInput,
    button(
      'Remove image',
      () => {
        ctx.setCatalog(
          updateTheme(ctx.getCatalog(), themeIndex, {
            background: { ...theme.background, image: null },
          })
        );
        ctx.onChanged();
        renderThemesEditor(root, ctx);
      },
      'btn small'
    )
  );

  return wrap;
}

function createThemeFromBasic(catalog: ThemesCatalogFile): ThemeEntry {
  const basic =
    catalog.themes.find((theme) => theme.alias === 'basic') ??
    catalog.themes[0];
  const alias = `theme-${Date.now()}`;
  return syncBordersToEventColors({
    ...basic,
    alias,
    name: 'New theme',
    background: { ...basic.background, image: null },
    borders: { ...basic.borders },
    buttons: { ...basic.buttons },
    eventColors: { ...basic.eventColors },
    sounds: { ...createEmptySoundsCatalog(), ...basic.sounds },
  });
}

function renderThemeEditor(
  themeIndex: number,
  catalog: ThemesCatalogFile,
  ctx: ThemesEditorContext,
  root: HTMLElement
): HTMLElement {
  const theme = catalog.themes[themeIndex];
  const body = el('div', { className: 'theme-sections' });

  const generalSection = el('section', { className: 'theme-section' });
  generalSection.append(el('h3', { text: 'General' }));

  const generalGrid = el('div', { className: 'form-grid' });
  generalGrid.append(
    field(
      'Alias',
      textInput(theme.alias, (v) => {
        ctx.setCatalog(updateTheme(ctx.getCatalog(), themeIndex, { alias: v }));
      })
    ),
    field(
      'Name',
      textInput(theme.name, (v) => {
        ctx.setCatalog(updateTheme(ctx.getCatalog(), themeIndex, { name: v }));
      })
    ),
    field(
      'Background image',
      renderBackgroundField(themeIndex, catalog, ctx, root),
      true
    )
  );

  const gradientGroup = el('div', { className: 'theme-field-group full' });
  gradientGroup.append(el('h4', { text: 'Gradient' }));
  const gradientGrid = el('div', { className: 'theme-color-grid' });
  for (const key of THEME_BACKGROUND_KEYS) {
    gradientGrid.append(
      colorField(THEME_BACKGROUND_LABELS[key], theme.background[key], (v) => {
        ctx.setCatalog(
          updateTheme(ctx.getCatalog(), themeIndex, {
            background: { ...theme.background, [key]: v },
          })
        );
      })
    );
  }
  gradientGroup.append(gradientGrid);

  const bordersGroup = el('div', { className: 'theme-field-group full' });
  bordersGroup.append(el('h4', { text: 'Borders' }));
  const bordersGrid = el('div', { className: 'theme-color-grid' });
  for (const key of THEME_BORDER_KEYS) {
    bordersGrid.append(
      colorField(THEME_BORDER_LABELS[key], theme.borders[key], (v) => {
        const borders = { ...theme.borders, [key]: v } as ThemeBorders;
        ctx.setCatalog(
          updateTheme(
            ctx.getCatalog(),
            themeIndex,
            syncBordersToEventColors({ ...theme, borders })
          )
        );
      })
    );
  }
  bordersGroup.append(bordersGrid);

  const buttonsGroup = el('div', { className: 'theme-field-group full' });
  buttonsGroup.append(el('h4', { text: 'Buttons' }));
  const buttonsGrid = el('div', { className: 'theme-color-grid' });
  for (const key of THEME_BUTTON_KEYS) {
    buttonsGrid.append(
      colorField(THEME_BUTTON_LABELS[key], theme.buttons[key], (v) => {
        const buttons = { ...theme.buttons, [key]: v } as ThemeButtons;
        ctx.setCatalog(updateTheme(ctx.getCatalog(), themeIndex, { buttons }));
      })
    );
  }
  buttonsGroup.append(buttonsGrid);

  generalGrid.append(gradientGroup, bordersGroup, buttonsGroup);
  generalSection.append(generalGrid);

  const audioSection = el('section', { className: 'theme-section' });
  audioSection.append(el('h3', { text: 'Audios' }));
  const audioGrid = el('div', { className: 'theme-audio-grid' });

  for (const soundId of SOUND_ACTION_IDS) {
    const card = el('div', { className: 'theme-audio-card' });
    card.append(
      el('h4', { text: SOUND_ACTION_LABELS[soundId] }),
      el('span', { className: 'chip', text: soundId }),
      field(
        'Volume',
        numberInput(theme.sounds[soundId].volume, (v) => {
          ctx.setCatalog(
            updateThemeSounds(ctx.getCatalog(), themeIndex, soundId, {
              volume: Math.min(1, Math.max(0, v)),
            })
          );
        }, { min: '0', max: '1', step: '0.05' })
      ),
      field(
        'File',
        renderSoundField(themeIndex, soundId, catalog, ctx, root),
        true
      )
    );
    audioGrid.append(card);
  }

  audioSection.append(audioGrid);
  body.append(generalSection, audioSection);

  if (theme.alias !== 'basic') {
    body.append(
      button(
        'Remove theme',
        () => {
          const next = {
            ...catalog,
            themes: catalog.themes.filter((_, i) => i !== themeIndex),
            defaultTheme:
              catalog.defaultTheme === theme.alias
                ? 'basic'
                : catalog.defaultTheme,
          };
          ctx.setCatalog(next);
          ctx.onChanged();
          renderThemesEditor(root, ctx);
        },
        'btn danger'
      )
    );
  }

  return body;
}

export function renderThemesEditor(
  root: HTMLElement,
  ctx: ThemesEditorContext
): void {
  clear(root);

  const catalog = ctx.getCatalog();
  const errorsBox = el('div');

  const themeOptions = catalog.themes.map((theme) => ({
    value: theme.alias,
    label: `${theme.name} (${theme.alias})`,
  }));

  const toolbar = el(
    'div',
    { className: 'toolbar' },
    button(
      'Add theme',
      () => {
        ctx.setCatalog({
          ...catalog,
          themes: [...catalog.themes, createThemeFromBasic(catalog)],
        });
        ctx.onChanged();
        renderThemesEditor(root, ctx);
      },
      'btn'
    ),
    button(
      'Save themes',
      async () => {
        const data = ctx.getCatalog();
        const errors = validateThemesCatalog(data);
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
          await saveData('themes-catalog', data);
          ctx.setStatus('Themes saved', 'ok');
        } catch (err) {
          ctx.setStatus(err instanceof Error ? err.message : String(err), 'err');
        }
      },
      'btn primary'
    )
  );

  const defaultThemeField = field(
    'Default theme',
    selectInput(catalog.defaultTheme, themeOptions, (v) => {
      ctx.setCatalog({ ...ctx.getCatalog(), defaultTheme: v });
    })
  );

  const list = el('div', { className: 'list' });
  catalog.themes.forEach((theme, index) => {
    list.append(
      accordionSection(
        `${theme.name} · ${theme.alias}`,
        renderThemeEditor(index, catalog, ctx, root)
      )
    );
  });

  root.append(
    el(
      'div',
      { className: 'panel' },
      el('h2', { text: 'Themes' }),
      el('p', {
        className: 'sub',
        text: 'Temas visuais e sonoros do jogo. Use changeTheme(alias) nos eventos para trocar conforme o progresso.',
      }),
      toolbar,
      defaultThemeField,
      errorsBox,
      list
    )
  );
}

export function collectThemeAliases(catalog: ThemesCatalogFile): string[] {
  return catalog.themes.map((theme) => theme.alias);
}
