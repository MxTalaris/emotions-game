import Phaser from 'phaser';
import {
  getSoundAction,
  SOUND_SFX_IDS,
  SoundActionConfig,
  SoundSfxId,
  SoundsCatalog,
} from '../data/sounds';

function audioKey(id: SoundSfxId): string {
  return `sfx-${id}`;
}

/**
 * Loads and plays optional SFX from the active theme sounds catalog.
 * Missing / empty path → no load and no playback.
 */
export class SoundEffects {
  private readonly scene: Phaser.Scene;
  private readonly loaded = new Set<SoundSfxId>();
  private catalog: SoundsCatalog;
  private enabled = false;

  constructor(scene: Phaser.Scene, catalog: SoundsCatalog) {
    this.scene = scene;
    this.catalog = catalog;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Queue catalog SFX that have a path for Phaser preload. */
  preload(): void {
    for (const id of SOUND_SFX_IDS) {
      this.queueLoad(id);
    }
  }

  setCatalog(catalog: SoundsCatalog): void {
    for (const id of SOUND_SFX_IDS) {
      const key = audioKey(id);
      const nextPath = catalog[id].path;
      const prevPath = this.catalog[id]?.path;
      if (nextPath !== prevPath && this.scene.cache.audio.exists(key)) {
        this.scene.cache.audio.remove(key);
        this.loaded.delete(id);
      }
    }
    this.catalog = catalog;
    for (const id of SOUND_SFX_IDS) {
      this.queueLoad(id);
    }
  }

  private queueLoad(id: SoundSfxId): void {
    const { path } = this.catalog[id];
    const key = audioKey(id);
    if (!path) {
      this.loaded.delete(id);
      return;
    }
    if (this.scene.cache.audio.exists(key)) {
      this.loaded.add(id);
      return;
    }
    this.scene.load.audio(key, path);
    this.loaded.add(id);
  }

  reloadMissing(onComplete?: () => void): void {
    let queued = false;
    for (const id of SOUND_SFX_IDS) {
      const { path } = this.catalog[id];
      const key = audioKey(id);
      if (!path || this.scene.cache.audio.exists(key)) continue;
      this.scene.load.audio(key, path);
      this.loaded.add(id);
      queued = true;
    }
    if (!queued) {
      onComplete?.();
      return;
    }
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => onComplete?.());
    this.scene.load.start();
  }

  play(id: SoundSfxId): void {
    if (!this.enabled) return;
    const config = this.getAction(id);
    const key = audioKey(id);
    if (!config.path || !this.loaded.has(id)) return;
    if (!this.scene.cache.audio.exists(key)) return;

    this.scene.sound.unlock();
    this.scene.sound.play(key, {
      volume: config.volume,
      loop: false,
    });
  }

  private getAction(id: SoundSfxId): SoundActionConfig {
    return this.catalog[id] ?? getSoundAction(id);
  }
}
