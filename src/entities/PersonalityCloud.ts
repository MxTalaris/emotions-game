import Phaser from 'phaser';
import { getPersonalityById } from '../data/personalities';
import { PersonalityId } from '../types';

const CLOUD_COLORS: Record<string, number> = {
  warm: 0xffab91,
  guarded: 0x90a4ae,
  impulsive: 0xff8a65,
};

const DEFAULT_CLOUD_COLOR = 0xb39ddb;

export class PersonalityCloud extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    personalityAlias: PersonalityId,
    finalScale = 1
  ) {
    super(scene, x, y);

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

    const nameText = scene.add.text(0, -4, label, {
      fontSize: '15px',
      color: '#1a1a2e',
      fontStyle: 'bold',
      align: 'center',
    });
    nameText.setOrigin(0.5);

    this.add([graphics, nameText]);
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
}
