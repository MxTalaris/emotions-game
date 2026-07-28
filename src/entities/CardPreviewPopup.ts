import Phaser from 'phaser';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
} from '../config/gameConfig';
import { getSuitColor } from '../data/cards';
import { CardInstance } from '../types';
import { domText } from '../utils/domUi';
import { cardTextureKey } from './CardSprite';

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
    const textureKey = cardTextureKey(card.alias);
    const hasImage = !!card.image && scene.textures.exists(textureKey);

    const visuals: Phaser.GameObjects.GameObject[] = [];

    if (hasImage) {
      const image = scene.add.image(centerX, centerY, textureKey);
      image.setDisplaySize(cardWidth, cardHeight);
      image.setInteractive({ useHandCursor: true });
      visuals.push(image);
      const border = scene.add.rectangle(
        centerX,
        centerY,
        cardWidth,
        cardHeight
      );
      border.setStrokeStyle(4, 0xffffff);
      border.setFillStyle(0x000000, 0);
      visuals.push(border);
    } else {
      const background = scene.add.rectangle(
        centerX,
        centerY,
        cardWidth,
        cardHeight,
        getSuitColor(card.suit)
      );
      background.setStrokeStyle(4, 0xffffff);
      background.setInteractive({ useHandCursor: true });
      visuals.push(background);
    }

    const title = domText(scene, card.name, {
      fontSize: '26px',
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
      maxWidth: `${cardWidth - 28}px`,
      wordBreak: 'break-word',
    });
    title.dom
      .setPosition(centerX, centerY - cardHeight * 0.28)
      .setOrigin(0.5)
      .setScrollFactor(0);

    const energy = domText(scene, `${card.energyAmount}`, {
      fontSize: '38px',
      color: '#ffffff',
      fontWeight: 'bold',
      textAlign: 'center',
    });
    energy.dom.setPosition(centerX, centerY + 8).setOrigin(0.5).setScrollFactor(0);

    const details = domText(
      scene,
      `Energia ${card.energyAmount}  •  Duração ${card.duration}`,
      {
        fontSize: '14px',
        color: '#ffffff',
        textAlign: 'center',
      }
    );
    details.dom
      .setPosition(centerX, centerY + cardHeight * 0.3)
      .setOrigin(0.5)
      .setScrollFactor(0);

    const close = () => {
      onClose();
      this.destroy();
    };

    dim.on('pointerdown', close);

    const clickTarget = visuals[0] as
      | Phaser.GameObjects.Image
      | Phaser.GameObjects.Rectangle;
    clickTarget.on('pointerdown', close);

    this.add([dim, ...visuals, title.dom, energy.dom, details.dom]);
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
