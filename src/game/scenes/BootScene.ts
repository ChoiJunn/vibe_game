import Phaser from 'phaser';
import type { RhythmGameController } from '../RhythmGameController';

export class BootScene extends Phaser.Scene {
  constructor(private readonly controller: RhythmGameController) {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('OfficeRhythmScene', { controller: this.controller });
  }
}
