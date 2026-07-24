import Phaser from 'phaser';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../config/gameConfig';
import { getSuitColor } from '../data/cards';
import { CardInstance } from '../types';

const PREVIEW_SCALE = 2.35;

export class CardPreviewPopup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, card: CardInstance, onClose: () => void) {
    super(scene, 0, 0);

    const dim = scene.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x211d18,
        0.68
      )
      .setInteractive();

    const cardWidth = CARD_WIDTH * PREVIEW_SCALE;
    const cardHeight = CARD_HEIGHT * PREVIEW_SCALE;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const background = scene.add.rectangle(
      centerX,
      centerY,
      cardWidth,
      cardHeight,
      getSuitColor(card.suit)
    );
    background.setStrokeStyle(4, 0xffffff);

    const title = scene.add
      .text(centerX, centerY - cardHeight * 0.28, card.name, {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: cardWidth - 28 },
      })
      .setOrigin(0.5);

    const energy = scene.add
      .text(centerX, centerY + 8, `${card.energyAmount}`, {
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const details = scene.add
      .text(
        centerX,
        centerY + cardHeight * 0.3,
        `Energia ${card.energyAmount}  •  Duração ${card.duration}`,
        {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    const close = () => {
      onClose();
      this.destroy();
    };

    dim.on('pointerdown', close);
    background.setInteractive({ useHandCursor: true });
    background.on('pointerdown', close);

    this.add([dim, background, title, energy, details]);
    this.setDepth(320);
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
