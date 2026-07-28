import Phaser from 'phaser';
import {
  getSoundAction,
  SOUND_SFX_IDS,
  SoundSfxId,
  soundsCatalog,
} from '../data/sounds';

function audioKey(id: SoundSfxId): string {
  return `sfx-${id}`;
}

/**
 * Loads and plays optional SFX from sounds-catalog.json.
 * Missing / empty path → no load and no playback.
 * Background music is handled separately in GameScene.
 */
export class SoundEffects {
  private readonly scene: Phaser.Scene;
  private readonly loaded = new Set<SoundSfxId>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Queue catalog SFX that have a path for Phaser preload. */
  preload(): void {
    for (const id of SOUND_SFX_IDS) {
      const { path } = soundsCatalog[id];
      if (!path) continue;
      this.scene.load.audio(audioKey(id), path);
      this.loaded.add(id);
    }
  }

  play(id: SoundSfxId): void {
    const config = getSoundAction(id);
    if (!config.path || !this.loaded.has(id)) return;
    if (!this.scene.cache.audio.exists(audioKey(id))) return;

    this.scene.sound.unlock();
    this.scene.sound.play(audioKey(id), {
      volume: config.volume,
      loop: false,
    });
  }
}
