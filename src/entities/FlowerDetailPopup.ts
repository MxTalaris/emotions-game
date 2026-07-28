import Phaser from 'phaser';
import { EVENT_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getCardByAlias } from '../data/cards';
import { EventCompletionCause, GameEventInstance } from '../types';

const PANEL_W = 380;
const PANEL_MAX_H = Math.min(GAME_HEIGHT * 0.78, 520);
const PANEL_MIN_H = 280;
const PANEL_PADDING = 24;
const HEADER_H = 56;
const CLOSE_SIZE = 32;
const BODY_FONT_SIZE = 14;
const BODY_LINE_HEIGHT = 1.5;

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
  measureDiv.style.cssText = [
    `width:${bodyWidth}px`,
    `font-size:${BODY_FONT_SIZE}px`,
    `line-height:${BODY_LINE_HEIGHT}`,
    'white-space:pre-wrap',
    'word-break:break-word',
    'position:absolute',
    'left:-9999px',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';');
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
  scrollDiv.style.cssText = [
    `width:${bodyWidth}px`,
    `height:${viewportHeight}px`,
    `font-size:${BODY_FONT_SIZE}px`,
    `line-height:${BODY_LINE_HEIGHT}`,
    'color:#4a4034',
    'overflow-y:auto',
    'overflow-x:hidden',
    'white-space:pre-wrap',
    'word-break:break-word',
    'box-sizing:border-box',
    '-webkit-overflow-scrolling:touch',
    'overscroll-behavior:contain',
    'touch-action:pan-y',
  ].join(';');
  scrollDiv.textContent = bodyText;
  scrollDiv.addEventListener('wheel', (event) => event.stopPropagation(), {
    passive: true,
  });
  scrollDiv.addEventListener('pointerdown', (event) => event.stopPropagation());
  return scrollDiv;
}

function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  strokeColor: number,
  completed: boolean,
  onClose: () => void
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);

  const bg = scene.add.circle(0, 0, CLOSE_SIZE / 2, 0xffffff, 0.92);
  bg.setStrokeStyle(2, strokeColor);

  const icon = scene.add
    .text(0, -1, '×', {
      fontSize: '26px',
      color: completed ? '#c45d7a' : '#8d6e4c',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  button.add([bg, icon]);
  button.setSize(CLOSE_SIZE, CLOSE_SIZE);
  button.setInteractive({ useHandCursor: true });

  button.on('pointerover', () => bg.setFillStyle(completed ? 0xfce4ec : 0xf5ebe0));
  button.on('pointerout', () => bg.setFillStyle(0xffffff, 0.92));
  button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    pointer.event.stopPropagation();
    onClose();
  });

  return button;
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
    const bodyTopY = panelTop + HEADER_H;

    const close = () => {
      onClose();
      this.destroy();
    };

    const dim = scene.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x2a241c, 0.55)
      .setInteractive();
    dim.on('pointerdown', close);

    const panelColor = eventData.completed ? 0xf7f1e6 : 0xfffaf2;
    const strokeColor = eventData.completed
      ? EVENT_COLORS.completedStroke
      : EVENT_COLORS.stroke;

    const panel = scene.add.rectangle(centerX, centerY, PANEL_W, panelH, panelColor);
    panel.setStrokeStyle(3, strokeColor);
    panel.setInteractive();

    const closeButton = createCloseButton(
      scene,
      panelLeft + PANEL_W - PANEL_PADDING - CLOSE_SIZE / 2,
      panelTop + PANEL_PADDING + CLOSE_SIZE / 2,
      strokeColor,
      eventData.completed,
      close
    );

    const title = scene.add.text(
      centerX,
      panelTop + PANEL_PADDING + 4,
      eventData.label,
      {
        fontSize: '20px',
        color: '#3d3428',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: PANEL_W - PANEL_PADDING * 2 - CLOSE_SIZE - 8 },
      }
    );
    title.setOrigin(0.5, 0);

    const scrollDiv = createScrollBodyElement(bodyText, bodyWidth, scrollViewportH);
    const bodyDom = scene.add.dom(panelLeft + PANEL_PADDING, bodyTopY, scrollDiv);
    bodyDom.setOrigin(0, 0);
    bodyDom.setScrollFactor(0);

    this.add([dim, panel, title, bodyDom, closeButton]);
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
