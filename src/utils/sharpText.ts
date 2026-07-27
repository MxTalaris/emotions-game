import Phaser from 'phaser';

/** Backing-store scale for Phaser.Text internal canvases (default is 1 → blurry on HiDPI). */
export function textResolution(game?: Phaser.Game): number {
  const dpr = window.devicePixelRatio || 1;
  const zoom = game?.scale?.zoom ?? 1;
  return Math.min(Math.max(dpr, zoom, 1), 3);
}

/**
 * Make every scene.add.text(...) render at HiDPI resolution by default.
 * Phaser Text is baked into a texture at style.resolution; leaving it at 1
 * looks soft even when the game canvas itself is sharp.
 */
export function installSharpText(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const original = factory.text;

  factory.text = function sharpText(
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    content?: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const resolution = textResolution(this.scene.game);
    const merged: Phaser.Types.GameObjects.Text.TextStyle = {
      ...(style ?? {}),
      resolution: style?.resolution ?? resolution,
    };
    return original.call(this, x, y, content as string, merged);
  };
}
