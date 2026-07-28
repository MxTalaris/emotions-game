import Phaser from 'phaser';
import { EVENT_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getCardByAlias } from '../data/cards';
import { css, GAME_FONT, stopPointerBubble } from '../utils/domUi';
import { EventCompletionCause, GameEventInstance } from '../types';

const PANEL_W = 380;
const PANEL_MAX_H = Math.min(GAME_HEIGHT * 0.78, 520);
const PANEL_MIN_H = 280;
const PANEL_PADDING = 24;
const HEADER_H = 56;
const CLOSE_SIZE = 32;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 1.5;

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function causeLabel(cause?: EventCompletionCause): string {
  switch (cause) {
    case 'autoComplete':
      return 'Tempo';
    case 'dealBreaker':
      return 'Deal-breaker';
    case 'energy':
      return 'Energia';
    default:
      return '—';
  }
}

function formatCardList(aliases: string[]): string {
  if (aliases.length === 0) return 'Nenhuma carta';

  const counts = new Map<string, { name: string; count: number }>();
  for (const alias of aliases) {
    const card = getCardByAlias(alias);
    const name = card?.name ?? alias;
    const entry = counts.get(alias);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(alias, { name, count: 1 });
    }
  }

  return Array.from(counts.values())
    .map(({ name, count }) => (count > 1 ? `${name} ×${count}` : name))
    .join(', ');
}

function formatEnergyText(eventData: GameEventInstance): string {
  if (eventData.energyAmountSecret && !eventData.completed) {
    return `${eventData.progress} / ?`;
  }
  return `${eventData.progress} / ${eventData.energyAmount}`;
}

function formatAutoCompleteText(eventData: GameEventInstance): string {
  if (eventData.autoComplete <= 0) return '—';

  if (eventData.completed) {
    return `${eventData.turnsAlive} turnos`;
  }

  const current = Math.min(
    eventData.turnsAlive + 1,
    eventData.autoComplete
  );
  const total = eventData.autoCompleteSecret
    ? '?'
    : String(eventData.autoComplete);

  return `${current}/${total}`;
}

function buildBodyLines(eventData: GameEventInstance): string[] {
  const lines: string[] = [];
  const description = eventData.description?.trim();

  if (description) {
    lines.push(description, '');
  }

  lines.push(
    `Energia: ${formatEnergyText(eventData)}`,
    `Cartas/turno: ${eventData.cardsPerTurn}${eventData.cardsRequired ? ' (obrigatório)' : ''}`,
    `Auto-complete: ${formatAutoCompleteText(eventData)}`
  );

  if (eventData.completed) {
    lines.push(`Conclusão: ${causeLabel(eventData.completionCause)}`);
    if (eventData.matchedDealBreakerAlias) {
      lines.push(`Deal-breaker: ${eventData.matchedDealBreakerAlias}`);
    }
    lines.push(`Turnos vivos: ${eventData.turnsAlive}`);
  } else {
    lines.push(`Turnos ativos: ${eventData.turnsAlive}`);
    lines.push(
      `Cartas neste turno: ${eventData.cardsPlacedThisTurn}/${eventData.cardsPerTurn}`
    );
  }

  lines.push('', 'Cartas usadas:', formatCardList(eventData.placedCardAliases));

  return lines;
}

function measureBodyHeight(bodyText: string, bodyWidth: number): number {
  const measureDiv = document.createElement('div');
  measureDiv.style.cssText = css({
    width: `${bodyWidth}px`,
    'font-family': GAME_FONT,
    'font-size': `${BODY_FONT_SIZE}px`,
    'line-height': `${BODY_LINE_HEIGHT}`,
    'white-space': 'pre-wrap',
    'word-break': 'break-word',
    position: 'absolute',
    left: '-9999px',
    top: '0',
    visibility: 'hidden',
    'pointer-events': 'none',
  });
  measureDiv.textContent = bodyText;
  document.body.appendChild(measureDiv);
  const height = measureDiv.scrollHeight;
  measureDiv.remove();
  return height;
}

function createScrollBodyElement(
  bodyText: string,
  bodyWidth: number,
  viewportHeight: number
): HTMLDivElement {
  const scrollDiv = document.createElement('div');
  scrollDiv.style.cssText = css({
    width: `${bodyWidth}px`,
    height: `${viewportHeight}px`,
    'font-family': GAME_FONT,
    'font-size': `${BODY_FONT_SIZE}px`,
    'line-height': `${BODY_LINE_HEIGHT}`,
    color: '#4a4034',
    'overflow-y': 'auto',
    'overflow-x': 'hidden',
    'white-space': 'pre-wrap',
    'word-break': 'break-word',
    'box-sizing': 'border-box',
    '-webkit-overflow-scrolling': 'touch',
    'overscroll-behavior': 'contain',
    'touch-action': 'pan-y',
  });
  scrollDiv.textContent = bodyText;
  stopPointerBubble(scrollDiv);
  return scrollDiv;
}

function createPanelElement(options: {
  label: string;
  bodyText: string;
  bodyWidth: number;
  panelH: number;
  scrollViewportH: number;
  completed: boolean;
  strokeColor: number;
  onClose: () => void;
}): HTMLDivElement {
  const strokeHex = hexColor(options.strokeColor);
  const bg = options.completed ? '#f7f1e6' : '#fffaf2';
  const closeColor = options.completed ? '#c45d7a' : '#8d6e4c';
  const closeHoverBg = options.completed ? '#fce4ec' : '#f5ebe0';

  const panel = document.createElement('div');
  panel.style.cssText = css({
    width: `${PANEL_W}px`,
    height: `${options.panelH}px`,
    'font-family': GAME_FONT,
    background: bg,
    border: `3px solid ${strokeHex}`,
    'box-sizing': 'border-box',
    position: 'relative',
    display: 'flex',
    'flex-direction': 'column',
  });
  stopPointerBubble(panel);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.style.cssText = [
    'position:absolute',
    `top:${PANEL_PADDING - 4}px`,
    `right:${PANEL_PADDING - 4}px`,
    `width:${CLOSE_SIZE}px`,
    `height:${CLOSE_SIZE}px`,
    'border-radius:50%',
    `border:2px solid ${strokeHex}`,
    'background:rgba(255,255,255,0.92)',
    `color:${closeColor}`,
    'font-size:22px',
    'font-weight:bold',
    'line-height:1',
    'cursor:pointer',
    'padding:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
  ].join(';');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = closeHoverBg;
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(255,255,255,0.92)';
  });
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    options.onClose();
  });
  stopPointerBubble(closeBtn);

  const title = document.createElement('h2');
  title.textContent = options.label;
  title.style.cssText = [
    'margin:0',
    `padding:${PANEL_PADDING}px ${PANEL_PADDING + CLOSE_SIZE}px 8px ${PANEL_PADDING}px`,
    'font-size:20px',
    'font-weight:bold',
    'color:#3d3428',
    'text-align:center',
    'line-height:1.25',
    'word-break:break-word',
    'flex-shrink:0',
  ].join(';');

  const scrollDiv = createScrollBodyElement(
    options.bodyText,
    options.bodyWidth,
    options.scrollViewportH
  );
  scrollDiv.style.margin = `0 ${PANEL_PADDING}px ${PANEL_PADDING}px`;

  panel.append(closeBtn, title, scrollDiv);
  return panel;
}

export class FlowerDetailPopup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, eventData: GameEventInstance, onClose: () => void) {
    super(scene, 0, 0);

    const bodyText = buildBodyLines(eventData).join('\n');
    const bodyWidth = PANEL_W - PANEL_PADDING * 2;
    const bodyContentH = measureBodyHeight(bodyText, bodyWidth);
    const maxScrollViewportH = PANEL_MAX_H - HEADER_H - PANEL_PADDING * 2;
    const needsScroll = bodyContentH > maxScrollViewportH;
    const scrollViewportH = needsScroll ? maxScrollViewportH : bodyContentH;
    const panelH = needsScroll
      ? PANEL_MAX_H
      : Phaser.Math.Clamp(
          HEADER_H + bodyContentH + PANEL_PADDING * 2,
          PANEL_MIN_H,
          PANEL_MAX_H
        );

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const panelLeft = centerX - PANEL_W / 2;
    const panelTop = centerY - panelH / 2;

    const close = () => {
      onClose();
      this.destroy();
    };

    const dim = scene.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x2a241c, 0.55)
      .setInteractive();
    dim.on('pointerdown', close);

    const strokeColor = eventData.completed
      ? EVENT_COLORS.completedStroke
      : EVENT_COLORS.stroke;

    const panelEl = createPanelElement({
      label: eventData.label,
      bodyText,
      bodyWidth,
      panelH,
      scrollViewportH,
      completed: eventData.completed,
      strokeColor,
      onClose: close,
    });

    const panelDom = scene.add.dom(panelLeft, panelTop, panelEl);
    panelDom.setOrigin(0, 0);
    panelDom.setScrollFactor(0);

    this.add([dim, panelDom]);
    this.setDepth(300);
    this.setScrollFactor(0);
    this.setAlpha(0);

    scene.add.existing(this);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }
}
