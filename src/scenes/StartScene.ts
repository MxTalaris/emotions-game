import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { PersonalityCloud } from '../entities/PersonalityCloud';
import { clearGameSession, loadPersonalityCollection } from '../systems/gameSession';

const CLOUD_SCALE = 0.8;
const CLOUD_SPACING_X = 130;
const CLOUD_SPACING_Y = 82;
const CLOUDS_PER_ROW = 5;

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e)
      .setDepth(0);

    this.add
      .text(GAME_WIDTH / 2, 110, 'Emotional DAMAGE', {
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 155, 'Sinta, escolha, descubra quem você é.', {
        fontSize: '16px',
        color: '#9fa8da',
      })
      .setOrigin(0.5);

    this.createPlayButton(GAME_WIDTH / 2, 225);
    this.createPersonalityGallery(320);
  }

  private createPlayButton(x: number, y: number): void {
    const background = this.add.rectangle(x, y, 160, 48, 0x5c6bc0);
    background.setStrokeStyle(2, 0x7986cb);
    background.setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'JOGAR', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    background.on('pointerover', () => background.setFillStyle(0x7986cb));
    background.on('pointerout', () => background.setFillStyle(0x5c6bc0));
    background.on('pointerdown', () => {
      clearGameSession();
      this.scene.start('GameScene');
    });
  }

  private createPersonalityGallery(topY: number): void {
    const personalities = loadPersonalityCollection();

    this.add
      .text(GAME_WIDTH / 2, topY, 'SUAS PERSONALIDADES', {
        fontSize: '14px',
        color: '#7986cb',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (personalities.length === 0) {
      this.add
        .text(
          GAME_WIDTH / 2,
          topY + 40,
          'Nenhuma descoberta ainda. Jogue para revelar a primeira.',
          {
            fontSize: '14px',
            color: '#5c6bc0',
          }
        )
        .setOrigin(0.5);
      return;
    }

    const firstRowY = topY + 60;

    personalities.forEach((alias, index) => {
      const row = Math.floor(index / CLOUDS_PER_ROW);
      const indexInRow = index % CLOUDS_PER_ROW;
      const rowSize = Math.min(
        CLOUDS_PER_ROW,
        personalities.length - row * CLOUDS_PER_ROW
      );
      const rowWidth = (rowSize - 1) * CLOUD_SPACING_X;
      const x = GAME_WIDTH / 2 - rowWidth / 2 + indexInRow * CLOUD_SPACING_X;

      new PersonalityCloud(
        this,
        x,
        firstRowY + row * CLOUD_SPACING_Y,
        alias,
        CLOUD_SCALE
      );
    });
  }
}
