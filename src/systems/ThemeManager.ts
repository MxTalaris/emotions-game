import Phaser from 'phaser';
import {
  getBackgroundMusicForTheme,
  resolveTheme,
  resolveThemeByAlias,
  themeBackgroundTextureKey,
} from '../data/themes';
import { DEFAULT_BGM_PATH } from '../data/sounds';
import { ResolvedTheme } from '../types/Theme';

/** Extra cover scale so parallax offsets never reveal empty edges. */
const PARALLAX_COVER_PAD = 1.28;

export interface BackgroundParallaxLayer {
  image: Phaser.GameObjects.Image;
  /** Multiplier of tree scroll X (0 = fixed, 1 = moves with tree). */
  factorX: number;
  /** Multiplier of tree scroll Y. */
  factorY: number;
}

export interface ThemeBackgroundDrawResult {
  objects: Phaser.GameObjects.GameObject[];
  parallaxLayers: BackgroundParallaxLayer[];
}

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

function coverScale(
  image: Phaser.GameObjects.Image,
  width: number,
  height: number
): number {
  return Math.max(width / image.width, height / image.height) * PARALLAX_COVER_PAD;
}

export function preloadThemeAssets(
  scene: Phaser.Scene,
  theme: ResolvedTheme
): void {
  if (theme.background.image) {
    scene.load.image(
      themeBackgroundTextureKey(theme.alias, 'base'),
      theme.background.image
    );
  }
  if (theme.background.overlayImage) {
    scene.load.image(
      themeBackgroundTextureKey(theme.alias, 'overlay'),
      theme.background.overlayImage
    );
  }
}

export function drawThemeBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  theme: ResolvedTheme
): ThemeBackgroundDrawResult {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const parallaxLayers: BackgroundParallaxLayer[] = [];
  const baseKey = themeBackgroundTextureKey(theme.alias, 'base');
  const overlayKey = themeBackgroundTextureKey(theme.alias, 'overlay');

  if (theme.background.image && scene.textures.exists(baseKey)) {
    const image = scene.add
      .image(width / 2, height / 2, baseKey)
      .setDepth(-2)
      .setScrollFactor(0);
    image.setScale(coverScale(image, width, height));
    objects.push(image);
    parallaxLayers.push({ image, factorX: 0.12, factorY: 0.1 });
  }

  if (theme.background.overlayImage && scene.textures.exists(overlayKey)) {
    const overlay = scene.add
      .image(width / 2, height / 2, overlayKey)
      .setDepth(-1)
      .setScrollFactor(0);
    overlay.setScale(coverScale(overlay, width, height));
    // Black areas of the overlay PNG become transparent with SCREEN.
    overlay.setBlendMode(Phaser.BlendModes.SCREEN);
    objects.push(overlay);
    parallaxLayers.push({ image: overlay, factorX: 0.32, factorY: 0.28 });
  }

  if (objects.length > 0) {
    return { objects, parallaxLayers };
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
  return { objects, parallaxLayers };
}

export function loadThemeBackgroundImage(
  scene: Phaser.Scene,
  theme: ResolvedTheme,
  onComplete: () => void
): void {
  const needsBase = Boolean(theme.background.image);
  const needsOverlay = Boolean(theme.background.overlayImage);
  if (!needsBase && !needsOverlay) {
    onComplete();
    return;
  }

  const baseKey = themeBackgroundTextureKey(theme.alias, 'base');
  const overlayKey = themeBackgroundTextureKey(theme.alias, 'overlay');
  const baseReady = !needsBase || scene.textures.exists(baseKey);
  const overlayReady = !needsOverlay || scene.textures.exists(overlayKey);
  if (baseReady && overlayReady) {
    onComplete();
    return;
  }

  if (needsBase && !scene.textures.exists(baseKey) && theme.background.image) {
    scene.load.image(baseKey, theme.background.image);
  }
  if (
    needsOverlay &&
    !scene.textures.exists(overlayKey) &&
    theme.background.overlayImage
  ) {
    scene.load.image(overlayKey, theme.background.overlayImage);
  }
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
