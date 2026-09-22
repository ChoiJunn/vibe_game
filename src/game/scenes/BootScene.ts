import Phaser from 'phaser';
import { GAME_ASSETS } from '@/game/assets';
import type { RhythmGameController } from '../RhythmGameController';

export class BootScene extends Phaser.Scene {
  constructor(private readonly controller: RhythmGameController) {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const imageAssets = [
      ...Object.values(GAME_ASSETS.backgrounds),
      ...Object.values(GAME_ASSETS.protagonist),
      ...Object.values(GAME_ASSETS.moka),
      ...Object.values(GAME_ASSETS.notes),
    ];

    for (const asset of imageAssets) {
      this.load.image(asset.key, asset.path);
    }
  }

  create(): void {
    this.scene.start('OfficeRhythmScene', { controller: this.controller });
  }
}
