import Phaser from 'phaser';
import { resolveSeed } from '../data/eventTemplates';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { PersonalityCloud } from '../entities/PersonalityCloud';
import {
  loadPersonalityCollection,
  startGameSession,
} from '../systems/gameSession';
import { PersonalityId } from '../types';

const CLOUD_SCALE = 0.8;
const CLOUD_SPACING_X = 130;
const CLOUD_SPACING_Y = 82;
const CLOUDS_PER_ROW = 5;
const MAX_SELECTED = 2;

export class StartScene extends Phaser.Scene {
  private selectedPersonalities: PersonalityId[] = [];
  private selectionRings = new Map<PersonalityId, Phaser.GameObjects.Ellipse>();
  private seedHintText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.selectedPersonalities = [];
    this.selectionRings.clear();

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e)
      .setDepth(0);

    this.add
      .text(GAME_WIDTH / 2, 70, 'Emotional DAMAGE', {
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 110, 'Sinta, escolha, descubra quem você é.', {
        fontSize: '16px',
        color: '#9fa8da',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 145, 'Selecione até 2 personalidades para a run', {
        fontSize: '13px',
        color: '#7986cb',
      })
      .setOrigin(0.5);

    this.seedHintText = this.add
      .text(GAME_WIDTH / 2, 170, '', {
        fontSize: '12px',
        color: '#a5d6a7',
      })
      .setOrigin(0.5);

    this.createPlayButton(GAME_WIDTH / 2, 215);
    this.createPersonalityGallery(280);
    this.refreshSeedHint();
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
      const session = startGameSession(this.selectedPersonalities);
      this.scene.start('GameScene', {
        seedId: session.seedId,
        selectedPersonalities: session.selectedPersonalities,
      });
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
          'Nenhuma descoberta ainda. Jogue a seed basic para começar.',
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
      const y = firstRowY + row * CLOUD_SPACING_Y;

      const cloud = new PersonalityCloud(this, x, y, alias, CLOUD_SCALE);
      cloud.setSelectable(() => this.togglePersonality(alias, x, y));

      const ring = this.add.ellipse(x, y - 5, 118, 76);
      ring.setStrokeStyle(3, 0x66bb6a, 1);
      ring.setFillStyle(0x000000, 0);
      ring.setVisible(false);
      ring.setDepth(70);
      this.selectionRings.set(alias, ring);
    });
  }

  private togglePersonality(alias: PersonalityId, x: number, y: number): void {
    const index = this.selectedPersonalities.indexOf(alias);
    if (index >= 0) {
      this.selectedPersonalities.splice(index, 1);
      this.selectionRings.get(alias)?.setVisible(false);
      this.refreshSeedHint();
      return;
    }

    if (this.selectedPersonalities.length >= MAX_SELECTED) {
      const removed = this.selectedPersonalities.shift();
      if (removed) {
        this.selectionRings.get(removed)?.setVisible(false);
      }
    }

    this.selectedPersonalities.push(alias);
    const ring = this.selectionRings.get(alias);
    if (ring) {
      ring.setPosition(x, y - 5);
      ring.setVisible(true);
    }
    this.refreshSeedHint();
  }

  private refreshSeedHint(): void {
    const seed = resolveSeed(this.selectedPersonalities);
    this.seedHintText.setText(`Seed: ${seed.id}`);
  }
}
