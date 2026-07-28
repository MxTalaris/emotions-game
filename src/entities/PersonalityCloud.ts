import Phaser from 'phaser';
import { getPersonalityById } from '../data/personalities';
import { PersonalityId } from '../types';
import { domText } from '../utils/domUi';

const CLOUD_COLORS: Record<string, number> = {
  warm: 0xffab91,
  guarded: 0x90a4ae,
  impulsive: 0xff8a65,
};

const DEFAULT_CLOUD_COLOR = 0xb39ddb;

/** Local hit area, generous enough to cover the whole drawn cloud. */
const HIT_WIDTH = 156;
const HIT_HEIGHT = 88;
const HIT_OFFSET_Y = -6;

export class PersonalityCloud extends Phaser.GameObjects.Container {
  private readonly baseScale: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    personalityAlias: PersonalityId,
    finalScale = 1
  ) {
    super(scene, x, y);

    this.baseScale = finalScale;

    const definition = getPersonalityById(personalityAlias);
    const label = definition?.name ?? personalityAlias;
    const fill = CLOUD_COLORS[personalityAlias] ?? DEFAULT_CLOUD_COLOR;

    const graphics = scene.add.graphics();
    graphics.fillStyle(fill, 0.95);
    graphics.fillEllipse(-36, 6, 70, 42);
    graphics.fillEllipse(36, 8, 66, 40);
    graphics.fillEllipse(0, -10, 88, 52);
    graphics.fillEllipse(-18, -22, 48, 34);
    graphics.fillEllipse(22, -20, 46, 32);
    graphics.lineStyle(2, 0xffffff, 0.35);
    graphics.strokeEllipse(0, -6, 110, 68);

    const nameText = domText(
      scene,
      label,
      {
        fontSize: '15px',
        color: '#1a1a2e',
        fontWeight: 'bold',
        textAlign: 'center',
        width: '110px',
        wordBreak: 'break-word',
      },
      { x: 0, y: -4, originX: 0.5, originY: 0.5 }
    );

    this.add([graphics, nameText.dom]);
    this.setSize(120, 72);
    this.setDepth(80);
    scene.add.existing(this);

    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scale: finalScale,
      duration: 450,
      ease: 'Back.easeOut',
    });
  }

  setSelectable(onSelect: () => void): void {
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(
        -HIT_WIDTH / 2,
        HIT_OFFSET_Y - HIT_HEIGHT / 2,
        HIT_WIDTH,
        HIT_HEIGHT
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.on('pointerover', () => this.tweenToScale(this.baseScale * 1.08));
    this.on('pointerout', () => this.tweenToScale(this.baseScale));
    this.on('pointerdown', onSelect);
  }

  private tweenToScale(scale: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale,
      duration: 140,
      ease: 'Sine.easeOut',
    });
  }
}
