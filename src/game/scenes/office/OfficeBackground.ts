import Phaser from 'phaser';
import type { SectionId } from '@/domain/rhythm';
import { GAME_ASSETS } from '@/game/assets';

export class OfficeBackground extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, GAME_ASSETS.backgrounds.arrival.key);
    scene.add.existing(this);
    this.setOrigin(0).setDisplaySize(1280, 720).setDepth(-10);
  }
}

export function renderOfficeBackground(background: OfficeBackground, section: SectionId): void {
  background.setTexture(GAME_ASSETS.backgrounds[section].key);
}
