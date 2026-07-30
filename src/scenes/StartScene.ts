import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { PersonalityCloud } from '../entities/PersonalityCloud';
import {
  loadPersonalityCollection,
  startGameSession,
} from '../systems/gameSession';
import { PersonalityId } from '../types';
import { css, domText, DomTextHandle, GAME_FONT, stopPointerBubble } from '../utils/domUi';

const SCREEN_TEXT_WIDTH = GAME_WIDTH - 48;

const CLOUD_SCALE = 0.8;
const CLOUD_SPACING_X = 130;
const CLOUD_SPACING_Y = 82;
const CLOUDS_PER_ROW = 5;
const MAX_SELECTED = 2;

export class StartScene extends Phaser.Scene {
  private selectedPersonalities: PersonalityId[] = [];
  private selectionRings = new Map<PersonalityId, Phaser.GameObjects.Ellipse>();

  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    this.selectedPersonalities = [];
    this.selectionRings.clear();

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e)
      .setDepth(0);

    this.addFixedText(GAME_WIDTH / 2, 70, 'Emotional DAMAGE', {
      fontSize: '36px',
      color: '#ffffff',
      fontWeight: 'bold',
    });

    this.addFixedText(GAME_WIDTH / 2, 110, 'Sinta, escolha, descubra quem você é.', {
      fontSize: '16px',
      color: '#9fa8da',
    });

    this.addFixedText(GAME_WIDTH / 2, 145, 'Selecione até 2 personalidades para a run', {
      fontSize: '13px',
      color: '#7986cb',
    });

    this.createPlayButton(GAME_WIDTH / 2, 215);
    this.createPersonalityGallery(280);
  }

  private addFixedText(
    x: number,
    y: number,
    text: string,
    style: Record<string, string | number>
  ): DomTextHandle {
    return domText(
      this,
      text,
      {
        width: `${SCREEN_TEXT_WIDTH}px`,
        textAlign: 'center',
        ...style,
      },
      {
        x,
        y,
        originX: 0.5,
        originY: 0.5,
        scrollFactor: 0,
        depth: 10,
      }
    );
  }

  private createPlayButton(x: number, y: number): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'JOGAR';
    button.style.cssText = css({
      width: '160px',
      height: '48px',
      fontFamily: GAME_FONT,
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff',
      background: '#5c6bc0',
      border: '2px solid #7986cb',
      cursor: 'pointer',
      padding: '0',
    });
    stopPointerBubble(button);

    const dom = this.add.dom(x, y, button);
    dom.setOrigin(0.5).setScrollFactor(0).setDepth(10);

    button.addEventListener('mouseenter', () => {
      button.style.background = '#7986cb';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#5c6bc0';
    });
    button.addEventListener('click', () => {
      const session = startGameSession(this.selectedPersonalities);
      this.scene.start('GameScene', {
        selectedPersonalities: session.selectedPersonalities,
      });
    });
  }

  private createPersonalityGallery(topY: number): void {
    const personalities = loadPersonalityCollection();

    this.addFixedText(GAME_WIDTH / 2, topY, 'SUAS PERSONALIDADES', {
      fontSize: '14px',
      color: '#7986cb',
      fontWeight: 'bold',
    });

    if (personalities.length === 0) {
      this.addFixedText(
        GAME_WIDTH / 2,
        topY + 40,
        'Nenhuma descoberta ainda. Jogue sem personalidades para começar.',
        {
          fontSize: '14px',
          color: '#5c6bc0',
        }
      );
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
  }
}
