import Phaser from 'phaser';
import { domBoxLabel, domText, DomTextHandle } from '../utils/domUi';

interface FeelButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
}

export class FeelButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: DomTextHandle;
  private enabled = true;

  constructor(scene: Phaser.Scene, options: FeelButtonOptions) {
    super(scene, options.x, options.y);

    this.background = scene.add.rectangle(
      0,
      0,
      options.width,
      options.height,
      0x5c6bc0
    );
    this.background.setStrokeStyle(2, 0x7986cb);

    this.label = domBoxLabel(
      scene,
      options.label,
      options.width,
      options.height,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontWeight: 'bold',
      },
      { x: 0, y: 0 }
    );

    this.add([this.background, this.label.dom]);
    this.setSize(options.width, options.height);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (this.enabled) this.background.setFillStyle(0x7986cb);
    });

    this.on('pointerout', () => {
      if (this.enabled) this.background.setFillStyle(0x5c6bc0);
    });

    this.on('pointerdown', () => {
      if (this.enabled) options.onClick();
    });

    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.background.setFillStyle(enabled ? 0x5c6bc0 : 0x444444);
    this.label.setAlpha(enabled ? 1 : 0.5);
  }
}
