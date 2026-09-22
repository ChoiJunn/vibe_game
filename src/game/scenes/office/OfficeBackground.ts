import Phaser from 'phaser';
import type { SectionId } from '@/domain/rhythm';
import { GAME_ASSETS } from '@/game/assets';
import type { Judgement } from '@/domain/rhythm';
import { getComboEnergyTier } from './OfficeCharacter';

const BACKGROUND_WIDTH = 1333;
const BACKGROUND_HEIGHT = 750;
const CROSSFADE_DURATION_MS = 760;

export function getJourneyPanOffset(songPositionMs: number, combo = 0, missEnergy = 0): number {
  const tier = Math.min(getComboEnergyTier(combo), 6);
  const amplitude = 14 + tier * 1.5 - Math.max(0, Math.min(1, missEnergy)) * 5;
  return Math.sin((songPositionMs / 12_000) * Math.PI * 2) * amplitude;
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
  private missStartedAtMs?: number;

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

  update(section: SectionId, songPositionMs: number, combo = 0, lastJudgement?: Judgement): void {
    if (lastJudgement === 'miss') this.missStartedAtMs = songPositionMs;
    if (section !== this.section) {
      this.section = section;
      this.transitionTargetKey = GAME_ASSETS.backgrounds[section].key;
      this.incoming.setTexture(this.transitionTargetKey).setAlpha(0);
      this.transitionStartedAtMs = songPositionMs;
    }

    const missEnergy = this.missStartedAtMs === undefined ? 0 : Math.max(0, 1 - (songPositionMs - this.missStartedAtMs) / 1_200);
    const pan = getJourneyPanOffset(songPositionMs, combo, missEnergy);
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
