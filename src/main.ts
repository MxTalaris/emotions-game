import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameConfig';
import { GameScene } from './scenes/GameScene';
import { StartScene } from './scenes/StartScene';
import { installSharpText, textResolution } from './utils/sharpText';

/**
 * Canvas backing-store zoom so FIT upscaling stays sharp on HiDPI screens.
 * CSS display ≈ gameSize * fitScale; physical pixels needed ≈ that * devicePixelRatio.
 * Phaser zoom grows the internal canvas while keeping world coords at GAME_WIDTH×GAME_HEIGHT.
 */
function computeHiDpiZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  return Math.min(Math.max(fit * dpr, 1), 3);
}

installSharpText();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  zoom: computeHiDpiZoom(),
  parent: document.body,
  backgroundColor: '#1a1a2e',
  scene: [StartScene, GameScene],
  audio: {
    disableWebAudio: false,
  },
  input: {
    activePointers: 3,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  callbacks: {
    postBoot: (game) => {
      const refreshTextResolution = () => {
        const res = textResolution(game);
        game.scene.getScenes(true).forEach((scene) => {
          scene.children.each((child) => {
            if (child instanceof Phaser.GameObjects.Text) {
              if (Math.abs(child.style.resolution - res) > 0.05) {
                child.setResolution(res);
              }
            }
            return true;
          });
        });
      };

      const syncZoom = () => {
        const next = computeHiDpiZoom();
        if (Math.abs(game.scale.zoom - next) > 0.05) {
          game.scale.setZoom(next);
        }
        refreshTextResolution();
      };
      window.addEventListener('resize', syncZoom);
      requestAnimationFrame(syncZoom);
    },
  },
};

new Phaser.Game(config);
