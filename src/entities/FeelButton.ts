import Phaser from 'phaser';
import { ResolvedButtonColors } from '../types/Theme';
import { domBoxLabel, domText, DomTextHandle } from '../utils/domUi';

interface FeelButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  theme?: ResolvedButtonColors;
}

export class FeelButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: DomTextHandle;
  private enabled = true;
  private theme: ResolvedButtonColors;

  constructor(scene: Phaser.Scene, options: FeelButtonOptions) {
    super(scene, options.x, options.y);

    this.theme = options.theme ?? {
      fill: 0x5c6bc0,
      stroke: 0x7986cb,
      hover: 0x7986cb,
      disabled: 0x444444,
      labelText: '#ffffff',
    };

    this.background = scene.add.rectangle(
      0,
      0,
      options.width,
      options.height,
      this.theme.fill
    );
    this.background.setStrokeStyle(2, this.theme.stroke);

    this.label = domBoxLabel(
      scene,
      options.label,
      options.width,
      options.height,
      {
        fontSize: '16px',
        color: this.theme.labelText,
        fontWeight: 'bold',
      },
      { x: 0, y: 0 }
    );

    this.add([this.background, this.label.dom]);
    this.setSize(options.width, options.height);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => {
      if (this.enabled) this.background.setFillStyle(this.theme.hover);
    });

    this.on('pointerout', () => {
      if (this.enabled) this.background.setFillStyle(this.theme.fill);
    });

    this.on('pointerdown', () => {
      if (this.enabled) options.onClick();
    });

    scene.add.existing(this);
  }

  applyTheme(theme: ResolvedButtonColors): void {
    this.theme = theme;
    this.background.setStrokeStyle(2, theme.stroke);
    this.label.element.style.color = theme.labelText;
    this.setEnabled(this.enabled);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.background.setFillStyle(enabled ? this.theme.fill : this.theme.disabled);
    this.label.setAlpha(enabled ? 1 : 0.5);
  }
}
