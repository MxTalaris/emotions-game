import Phaser from 'phaser';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  HAND_CARD_HOVER_SCALE,
} from '../config/gameConfig';
import { getSuitColor } from '../data/cards';
import { CardInstance } from '../types';
import { domBoxLabel, domText, DomTextHandle } from '../utils/domUi';

export function cardTextureKey(alias: string): string {
  return `card-img-${alias}`;
}

export class CardSprite extends Phaser.GameObjects.Container {
  readonly cardData: CardInstance;
  private background: Phaser.GameObjects.GameObject;
  private label: DomTextHandle;
  private homeX: number;
  private homeY: number;
  private homeRotation = 0;
  private handScale = 1;
  private placed = false;
  private committed = false;
  private draggedSincePointerDown = false;
  private previewHandler: (() => void) | null = null;

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
    const textureKey = cardTextureKey(cardData.alias);
    const hasImage =
      !!cardData.image && scene.textures.exists(textureKey);

    const children: Phaser.GameObjects.GameObject[] = [];

    if (hasImage) {
      const image = scene.add.image(0, 0, textureKey);
      image.setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
      this.background = image;
      children.push(image);

      const border = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT);
      border.setStrokeStyle(2, 0xffffff);
      border.setFillStyle(0x000000, 0);
      children.push(border);
    } else {
      const rect = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, color);
      rect.setStrokeStyle(2, 0xffffff);
      this.background = rect;
      children.push(rect);
    }

    const cardTextWidth = CARD_WIDTH - 10;

    this.label = domText(
      scene,
      cardData.name,
      {
        fontSize: '14px',
        color: '#ffffff',
        textAlign: 'center',
        width: `${cardTextWidth}px`,
        wordBreak: 'break-word',
      },
      { x: 0, y: -12, originX: 0.5, originY: 0.5 }
    );

    const energyLabel = domBoxLabel(
      scene,
      `${cardData.energyAmount}`,
      cardTextWidth,
      22,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontWeight: 'bold',
      },
      { x: 0, y: 18 }
    );

    this.add([...children, this.label.dom, energyLabel.dom]);
    this.setSize(CARD_WIDTH, CARD_HEIGHT);
    this.setInteractive({ draggable: true, useHandCursor: true });
    this.setDepth(40);

    this.on('pointerdown', () => {
      this.draggedSincePointerDown = false;
    });
    this.on('pointerover', () => {
      if (this.placed || this.draggedSincePointerDown) return;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scale: HAND_CARD_HOVER_SCALE,
        duration: 120,
        ease: 'Sine.easeOut',
      });
      this.setDepth(90);
    });
    this.on('pointerout', () => {
      if (this.placed || this.draggedSincePointerDown) return;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scale: this.handScale,
        duration: 120,
        ease: 'Sine.easeOut',
      });
      this.setDepth(40);
    });
    this.on('pointerup', () => {
      if (!this.placed && !this.draggedSincePointerDown) {
        this.previewHandler?.();
      }
    });

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

  setPreviewHandler(handler: () => void): void {
    this.previewHandler = handler;
  }

  setHomePose(x: number, y: number, rotation: number, scale: number): void {
    this.homeX = x;
    this.homeY = y;
    this.homeRotation = rotation;
    this.handScale = scale;
  }

  onDragStart(): void {
    this.draggedSincePointerDown = true;
    this.scene.tweens.killTweensOf(this);
    this.setScale(1.05);
    this.setRotation(0);
    this.setDepth(100);
  }

  returnToHand(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.homeX,
      y: this.homeY,
      scale: this.handScale,
      rotation: this.homeRotation,
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
    this.setScale(this.handScale);
    this.setRotation(this.homeRotation);
    this.setDepth(100);
  }
}
