import Phaser from 'phaser';
import type { AudioClockState } from '@/game/audio/types';
import { GAME_ASSETS } from '@/game/assets';

export function getWalkPoseKey(state: AudioClockState, songPositionMs: number): string | undefined {
  if (state !== 'playing') {
    return undefined;
  }

  return Math.floor(songPositionMs / 272) % 2 === 0
    ? GAME_ASSETS.protagonist.walkA.key
    : GAME_ASSETS.protagonist.walkB.key;
}

export class OfficeCharacter {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.image(x, y, GAME_ASSETS.protagonist.walkA.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(220, 220)
      .setDepth(2);
  }

  update(state: AudioClockState, songPositionMs: number): void {
    const poseKey = getWalkPoseKey(state, songPositionMs);
    if (poseKey && this.sprite.texture.key !== poseKey) {
      this.sprite.setTexture(poseKey);
    }
  }
}
