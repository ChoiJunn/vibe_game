import Phaser from 'phaser';
import { GAME_VIEWPORT } from './config';
import type { RhythmGameController } from './RhythmGameController';
import { BootScene } from './scenes/BootScene';
import { OfficeRhythmScene } from './scenes/OfficeRhythmScene';

export function createPhaserGame(parent: HTMLElement, controller: RhythmGameController): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_VIEWPORT.width,
    height: GAME_VIEWPORT.height,
    backgroundColor: '#16212b',
    scene: [new BootScene(controller), new OfficeRhythmScene(controller)],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_VIEWPORT.width,
      height: GAME_VIEWPORT.height,
    },
    render: {
      antialias: true,
      roundPixels: true,
    },
  });
}
