import styles from './styles.css';
import '@xyflow/react/dist/style.css';
import { loadData } from './api';
import { clear, el } from './dom';
import { renderCardsEditor } from './editors/CardsEditor';
import {
  renderEventsEditor,
  resetEventsView,
} from './editors/EventsEditor';
import { renderPersonalitiesEditor } from './editors/PersonalitiesEditor';
import {
  collectThemeAliases,
  renderThemesEditor,
} from './editors/ThemesEditor';
import {
  EmotionsCatalog,
  EventTemplatesFile,
  PersonalityEntry,
  ThemesCatalogFile,
} from './types';
import { collectCardAliases } from './validate';
import { createBasicTheme } from '../data/themes';

const styleTag = document.createElement('style');
styleTag.textContent = styles;
document.head.append(styleTag);

type TabId = 'personalities' | 'cards' | 'events' | 'themes';

let personalities: PersonalityEntry[] = [];
let emotionsCatalog: EmotionsCatalog = {};
let eventTemplates: EventTemplatesFile = { events: [] };
let themesCatalog: ThemesCatalogFile = {
  defaultTheme: 'basic',
  themes: [createBasicTheme()],
};
let activeTab: TabId = 'personalities';

const app = document.getElementById('app');
if (!app) {
  throw new Error('#app not found');
}

const statusEl = el('div', { className: 'status' });
const contentEl = el('div', { id: 'tab-content' });

function setStatus(message: string, kind?: 'ok' | 'err' | 'warn'): void {
  statusEl.textContent = message;
  statusEl.className = kind ? `status ${kind}` : 'status';
}

function renderActiveTab(): void {
  clear(contentEl);
  if (activeTab === 'personalities') {
    renderPersonalitiesEditor(contentEl, {
      getPersonalities: () => personalities,
      setPersonalities: (next) => {
        personalities = next;
      },
      setStatus,
      onChanged: () => renderActiveTab(),
    });
  } else if (activeTab === 'cards') {
    renderCardsEditor(contentEl, {
      getCatalog: () => emotionsCatalog,
      setCatalog: (next) => {
        emotionsCatalog = next;
      },
      setStatus,
      onChanged: () => renderActiveTab(),
    });
  } else if (activeTab === 'events') {
    renderEventsEditor(contentEl, {
      getEvents: () => eventTemplates,
      setEvents: (next) => {
        eventTemplates = next;
      },
      getPersonalities: () => personalities,
      getCardAliases: () => [...collectCardAliases(emotionsCatalog)].sort(),
      getThemeAliases: () => collectThemeAliases(themesCatalog),
      setStatus,
      onChanged: () => renderActiveTab(),
    });
  } else {
    renderThemesEditor(contentEl, {
      getCatalog: () => themesCatalog,
      setCatalog: (next) => {
        themesCatalog = next;
      },
      setStatus,
      onChanged: () => renderActiveTab(),
    });
  }
}

function setTab(tab: TabId): void {
  activeTab = tab;
  if (tab !== 'events') {
    resetEventsView();
  }
  for (const btn of tabButtons) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  }
  renderActiveTab();
}

const tabButtons: HTMLButtonElement[] = (
  [
    ['personalities', 'Personalities'],
    ['cards', 'Cards'],
    ['events', 'Events'],
    ['themes', 'Themes'],
  ] as const
).map(([id, label]) => {
  const btn = el('button', {
    type: 'button',
    className: id === activeTab ? 'tab active' : 'tab',
    text: label,
    dataset: { tab: id },
    onClick: () => setTab(id),
  }) as HTMLButtonElement;
  return btn;
});

app.append(
  el(
    'header',
    { className: 'admin-header' },
    el(
      'div',
      {},
      el('h1', { text: 'Content Admin' }),
      el('div', {
        className: 'sub',
        text: 'Edit personalities, cards, events, and themes · saves to src/data/',
      })
    ),
    el(
      'a',
      {
        href: '/',
        className: 'btn',
        text: '← Back to game',
      }
    )
  ),
  el('nav', { className: 'tabs' }, ...tabButtons),
  el('div', { className: 'toolbar' }, statusEl),
  contentEl
);

async function boot(): Promise<void> {
  setStatus('Loading…');
  try {
    const [p, cards, events, themes] = await Promise.all([
      loadData<PersonalityEntry[]>('personalities-catalog'),
      loadData<EmotionsCatalog>('emotions-catalog'),
      loadData<EventTemplatesFile>('event-templates'),
      loadData<ThemesCatalogFile>('themes-catalog'),
    ]);
    personalities = p;
    emotionsCatalog = cards;
    eventTemplates = events;
    themesCatalog = themes;
    setStatus('Ready');
    renderActiveTab();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), 'err');
    contentEl.append(
      el('div', {
        className: 'errors',
        text:
          'Could not load data. Run via `npm run dev` so the local API is available.',
      })
    );
  }
}

boot();
