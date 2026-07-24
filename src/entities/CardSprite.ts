import Phaser from 'phaser';
import { CARD_HEIGHT, CARD_WIDTH } from '../config/gameConfig';
import { getSuitColor } from '../data/cards';
import { CardInstance } from '../types';

export class CardSprite extends Phaser.GameObjects.Container {
  readonly cardData: CardInstance;
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private homeX: number;
  private homeY: number;
  private placed = false;
  private committed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardData: CardInstance
  ) {
    super(scene, x, y);

    this.cardData = cardData;
    this.homeX = x;
    this.homeY = y;

    const color = getSuitColor(cardData.suit);

    this.background = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, color);
    this.background.setStrokeStyle(2, 0xffffff);

    this.label = scene.add.text(0, -12, cardData.name, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 10 },
    });
    this.label.setOrigin(0.5);

    const energyLabel = scene.add.text(0, 18, `${cardData.energyAmount}`, {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
    });
    energyLabel.setOrigin(0.5);

    this.add([this.background, this.label, energyLabel]);
    this.setSize(CARD_WIDTH, CARD_HEIGHT);
    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setDepth(40);

    scene.add.existing(this);
  }

  get isPlaced(): boolean {
    return this.placed;
  }

  get isCommitted(): boolean {
    return this.committed;
  }

  /** Placed this turn — can be dragged back to hand before Sentir. */
  get canRecall(): boolean {
    return this.placed && !this.committed;
  }

  getHomePosition(): { x: number; y: number } {
    return { x: this.homeX, y: this.homeY };
  }

  setHomePosition(x: number, y: number): void {
    this.homeX = x;
    this.homeY = y;
  }

  onDragStart(): void {
    this.setScale(1.05);
    this.setDepth(100);
  }

  returnToHand(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.homeX,
      y: this.homeY,
      scale: 1,
      duration: 200,
      ease: 'Power2',
    });
    this.setDepth(40);
  }

  placeInEvent(
    x: number,
    y: number,
    eventInstanceId: number,
    scale: number,
    committed: boolean
  ): void {
    this.placed = true;
    this.committed = committed;
    this.cardData.eventInstanceId = eventInstanceId;

    if (committed) {
      this.disableInteractive();
    } else {
      this.setInteractive({ draggable: true, useHandCursor: true });
    }

    this.scene.tweens.add({
      targets: this,
      x,
      y,
      scale,
      duration: 250,
      ease: 'Power2',
    });
    this.setDepth(25);
  }

  prepareRecall(): void {
    this.placed = false;
    this.committed = false;
    this.cardData.eventInstanceId = undefined;
    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setScale(1);
    this.setDepth(100);
  }
}
