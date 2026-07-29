import Phaser from 'phaser';
import {
  getBackgroundMusicForTheme,
  resolveTheme,
  resolveThemeByAlias,
  themeBackgroundTextureKey,
} from '../data/themes';
import { DEFAULT_BGM_PATH } from '../data/sounds';
import { ResolvedTheme } from '../types/Theme';

export class ThemeManager {
  private active: ResolvedTheme;

  constructor(initialAlias?: string) {
    const resolved =
      (initialAlias ? resolveThemeByAlias(initialAlias) : undefined) ??
      resolveThemeByAlias('basic');
    if (!resolved) {
      throw new Error('ThemeManager: no themes available');
    }
    this.active = resolved;
  }

  getActive(): ResolvedTheme {
    return this.active;
  }

  getAlias(): string {
    return this.active.alias;
  }

  changeTheme(alias: string): boolean {
    const next = resolveThemeByAlias(alias);
    if (!next) {
      console.warn(`changeTheme: unknown theme "${alias}"`);
      return false;
    }
    this.active = next;
    return true;
  }

  getBackgroundMusicConfig(): { path: string; volume: number } {
    return getBackgroundMusicForTheme(this.active.sounds);
  }
}

export function preloadThemeAssets(
  scene: Phaser.Scene,
  theme: ResolvedTheme
): void {
  if (theme.background.image) {
    scene.load.image(
      themeBackgroundTextureKey(theme.alias),
      theme.background.image
    );
  }
}

export function drawThemeBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  theme: ResolvedTheme
): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const textureKey = themeBackgroundTextureKey(theme.alias);

  if (theme.background.image && scene.textures.exists(textureKey)) {
    const image = scene.add
      .image(width / 2, height / 2, textureKey)
      .setDepth(-1)
      .setScrollFactor(0);
    const scale = Math.max(width / image.width, height / image.height);
    image.setScale(scale);
    objects.push(image);
    return objects;
  }

  const g = scene.add.graphics().setDepth(-1).setScrollFactor(0);
  const bands = 10;
  const { skyTop, skyMid, ground } = theme.background;

  for (let i = 0; i < bands; i += 1) {
    const t = i / (bands - 1);
    const y0 = (height / bands) * i;
    const bandH = height / bands + 1;
    const color =
      t < 0.45
        ? Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.IntegerToColor(skyTop),
            Phaser.Display.Color.IntegerToColor(skyMid),
            100,
            Math.round((t / 0.45) * 100)
          )
        : Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.IntegerToColor(skyMid),
            Phaser.Display.Color.IntegerToColor(ground),
            100,
            Math.round(((t - 0.45) / 0.55) * 100)
          );

    const hex =
      (Math.round(color.r) << 16) +
      (Math.round(color.g) << 8) +
      Math.round(color.b);
    g.fillStyle(hex, 1);
    g.fillRect(0, y0, width, bandH);
  }

  objects.push(g);
  return objects;
}

export function loadThemeBackgroundImage(
  scene: Phaser.Scene,
  theme: ResolvedTheme,
  onComplete: () => void
): void {
  if (!theme.background.image) {
    onComplete();
    return;
  }

  const textureKey = themeBackgroundTextureKey(theme.alias);
  if (scene.textures.exists(textureKey)) {
    onComplete();
    return;
  }

  scene.load.image(textureKey, theme.background.image);
  scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
  scene.load.start();
}

export function loadThemeBgm(
  scene: Phaser.Scene,
  bgmKey: string,
  path: string,
  onComplete: () => void
): void {
  if (scene.cache.audio.exists(bgmKey)) {
    onComplete();
    return;
  }

  scene.load.audio(bgmKey, path);
  scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
  scene.load.start();
}

export function resolveThemeBgmPath(path: string): string {
  return path || DEFAULT_BGM_PATH;
}

export { resolveTheme };
