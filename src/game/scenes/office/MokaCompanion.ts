import Phaser from 'phaser';
import type { SectionId } from '@/domain/rhythm';
import { GAME_ASSETS } from '@/game/assets';

export function getMokaForm(section: SectionId): 'tumbler' | 'deskCup' {
  return section === 'arrival' || section === 'departure' ? 'tumbler' : 'deskCup';
}

export class MokaCompanion {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly carryX: number;
  private readonly carryY: number;
  private readonly deskX: number;
  private readonly deskY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.carryX = x - 64;
    this.carryY = y - 46;
    this.deskX = x + 405;
    this.deskY = y;
    this.sprite = scene.add.image(this.carryX, this.carryY, GAME_ASSETS.moka.tumbler.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(72, 72)
      .setDepth(3);
  }

  update(section: SectionId, combo: number): void {
    const form = getMokaForm(section);
    const asset = GAME_ASSETS.moka[form];
    const carried = form === 'tumbler';
    const size = carried ? 72 : 112 + Math.min(combo, 20) * 0.35;
    this.sprite.setPosition(carried ? this.carryX : this.deskX, carried ? this.carryY : this.deskY);
    this.sprite.setDisplaySize(size, size);
    if (this.sprite.texture.key !== asset.key) {
      this.sprite.setTexture(asset.key);
    }
  }
}
