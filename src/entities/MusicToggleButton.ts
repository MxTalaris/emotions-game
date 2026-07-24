import Phaser from 'phaser';

interface MusicToggleButtonOptions {
  x: number;
  y: number;
  size: number;
  enabled?: boolean;
  onToggle: (enabled: boolean) => void;
}

export class MusicToggleButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private iconGfx: Phaser.GameObjects.Graphics;
  private enabled: boolean;
  private readonly size: number;

  constructor(scene: Phaser.Scene, options: MusicToggleButtonOptions) {
    super(scene, options.x, options.y);

    this.size = options.size;
    this.enabled = options.enabled ?? false;

    this.background = scene.add.rectangle(
      0,
      0,
      options.size,
      options.size,
      this.enabled ? 0x5c6bc0 : 0x444444
    );
    this.background.setStrokeStyle(2, 0x7986cb);

    this.iconGfx = scene.add.graphics();
    this.add([this.background, this.iconGfx]);
    this.setSize(options.size, options.size);
    this.setInteractive({ useHandCursor: true });
    this.drawIcon();

    this.on('pointerover', () => {
      this.background.setFillStyle(0x7986cb);
    });

    this.on('pointerout', () => {
      this.background.setFillStyle(this.enabled ? 0x5c6bc0 : 0x444444);
    });

    this.on('pointerdown', () => {
      this.enabled = !this.enabled;
      this.drawIcon();
      this.background.setFillStyle(this.enabled ? 0x7986cb : 0x555555);
      options.onToggle(this.enabled);
    });

    scene.add.existing(this);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  containsPoint(x: number, y: number): boolean {
    const half = this.size / 2;
    return (
      x >= this.x - half &&
      x <= this.x + half &&
      y >= this.y - half &&
      y <= this.y + half
    );
  }

  private drawIcon(): void {
    this.iconGfx.clear();

    const color = this.enabled ? 0xffffff : 0xbdbdbd;
    this.iconGfx.fillStyle(color, 1);
    this.iconGfx.lineStyle(2, color, 1);

    // Speaker body
    this.iconGfx.fillTriangle(-8, -6, -2, -6, -2, 6);
    this.iconGfx.fillRect(-10, -4, 4, 8);
    this.iconGfx.fillTriangle(-2, -6, 4, -10, 4, 10);
    this.iconGfx.fillTriangle(-2, 6, 4, 10, 4, -10);

    if (this.enabled) {
      // Sound waves
      this.iconGfx.strokeCircle(2, 0, 6);
      this.iconGfx.strokeCircle(2, 0, 10);
      return;
    }

    // Mute slash
    this.iconGfx.lineStyle(3, 0xef5350, 1);
    this.iconGfx.beginPath();
    this.iconGfx.moveTo(-11, 11);
    this.iconGfx.lineTo(11, -11);
    this.iconGfx.strokePath();
  }
}
