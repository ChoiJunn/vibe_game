import Phaser from 'phaser';
import type { SectionId } from '@/domain/rhythm';
import { GAME_ASSETS } from '@/game/assets';

const BACKGROUND_WIDTH = 1333;
const BACKGROUND_HEIGHT = 750;
const CROSSFADE_DURATION_MS = 760;

export function getJourneyPanOffset(songPositionMs: number): number {
  return Math.sin((songPositionMs / 12_000) * Math.PI * 2) * 14;
}

export function getCrossfadeProgress(songPositionMs: number, startedAtMs: number): number {
  return Math.max(0, Math.min(1, (songPositionMs - startedAtMs) / CROSSFADE_DURATION_MS));
}

export class OfficeBackground {
  private readonly current: Phaser.GameObjects.Image;
  private readonly incoming: Phaser.GameObjects.Image;
  private section: SectionId = 'arrival';
  private transitionStartedAtMs?: number;
  private transitionTargetKey = GAME_ASSETS.backgrounds.arrival.key;

  constructor(scene: Phaser.Scene) {
    this.current = scene.add.image(0, 0, GAME_ASSETS.backgrounds.arrival.key)
      .setOrigin(0)
      .setDisplaySize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
      .setDepth(-10);
    this.incoming = scene.add.image(0, 0, GAME_ASSETS.backgrounds.arrival.key)
      .setOrigin(0)
      .setDisplaySize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
      .setAlpha(0)
      .setDepth(-9);
  }

  update(section: SectionId, songPositionMs: number): void {
    if (section !== this.section) {
      this.section = section;
      this.transitionTargetKey = GAME_ASSETS.backgrounds[section].key;
      this.incoming.setTexture(this.transitionTargetKey).setAlpha(0);
      this.transitionStartedAtMs = songPositionMs;
    }

    const pan = getJourneyPanOffset(songPositionMs);
    this.current.setPosition(-26.5 + pan, -15);
    this.incoming.setPosition(-26.5 + pan, -15);

    if (this.transitionStartedAtMs === undefined) {
      return;
    }

    const progress = getCrossfadeProgress(songPositionMs, this.transitionStartedAtMs);
    this.current.setAlpha(1 - progress);
    this.incoming.setAlpha(progress);

    if (progress >= 1) {
      this.current.setTexture(this.transitionTargetKey).setAlpha(1);
      this.incoming.setAlpha(0);
      this.transitionStartedAtMs = undefined;
    }
  }
}
