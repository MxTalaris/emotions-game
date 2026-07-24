import Phaser from 'phaser';
import { EVENT_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { getCardByAlias } from '../data/cards';
import { EventCompletionCause, GameEventInstance } from '../types';

const PANEL_W = 360;
const PANEL_H = 320;

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

export class FlowerDetailPopup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, eventData: GameEventInstance, onClose: () => void) {
    super(scene, 0, 0);

    const dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a241c, 0.55)
      .setInteractive();

    const panel = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      PANEL_W,
      PANEL_H,
      0xf7f1e6
    );
    panel.setStrokeStyle(3, EVENT_COLORS.completedStroke);

    const title = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - PANEL_H / 2 + 28, eventData.label, {
        fontSize: '20px',
        color: '#3d3428',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: PANEL_W - 40 },
      })
      .setOrigin(0.5, 0);

    const energyText =
      eventData.energyAmountSecret && eventData.progress < eventData.energyAmount
        ? `${eventData.progress} / ?`
        : `${eventData.progress} / ${eventData.energyAmount}`;

    const bodyLines = [
      `Energia: ${energyText}`,
      `Conclusão: ${causeLabel(eventData.completionCause)}`,
      `Turnos vivos: ${eventData.turnsAlive}`,
      `Cartas/turno: ${eventData.cardsPerTurn}`,
      '',
      'Cartas usadas:',
      formatCardList(eventData.placedCardAliases),
    ];

    if (eventData.matchedDealBreakerAlias) {
      bodyLines.splice(2, 0, `Deal-breaker: ${eventData.matchedDealBreakerAlias}`);
    }

    const body = scene.add
      .text(GAME_WIDTH / 2 - PANEL_W / 2 + 24, GAME_HEIGHT / 2 - PANEL_H / 2 + 70, bodyLines.join('\n'), {
        fontSize: '14px',
        color: '#4a4034',
        lineSpacing: 6,
        wordWrap: { width: PANEL_W - 48 },
      })
      .setOrigin(0, 0);

    const closeBg = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + PANEL_H / 2 - 36,
      100,
      36,
      EVENT_COLORS.completedStroke
    );
    closeBg.setInteractive({ useHandCursor: true });

    const closeLabel = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + PANEL_H / 2 - 36, 'Fechar', {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const close = () => {
      onClose();
      this.destroy();
    };

    dim.on('pointerdown', close);
    closeBg.on('pointerdown', close);
    closeBg.on('pointerover', () => closeBg.setFillStyle(EVENT_COLORS.completed));
    closeBg.on('pointerout', () => closeBg.setFillStyle(EVENT_COLORS.completedStroke));

    this.add([dim, panel, title, body, closeBg, closeLabel]);
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
