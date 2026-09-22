import Phaser from 'phaser';
import type { SectionId, Judgement } from '@/domain/rhythm';
import type { AudioClockState } from '@/game/audio/types';
import { GAME_ASSETS } from '@/game/assets';
import type { JudgementResult } from '@/game/judgement/types';

export class OfficeCharacter {
  private readonly protagonist: Phaser.GameObjects.Image;
  private readonly moka: Phaser.GameObjects.Image;
  private lastJudgementEventId?: string;
  private reactionUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.protagonist = scene.add.image(x, y, GAME_ASSETS.protagonist.walkA.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(220, 220)
      .setDepth(2);
    this.moka = scene.add.image(x + 430, y, GAME_ASSETS.moka.tumbler.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(112, 112)
      .setDepth(2);
  }

  update(state: AudioClockState, result: JudgementResult | undefined, section: SectionId, now: number): void {
    if (result && result.eventId !== this.lastJudgementEventId) {
      this.lastJudgementEventId = result.eventId;
      this.reactionUntil = now + 520;
    }

    const reacting = now < this.reactionUntil;
    const judgement: Judgement | undefined = reacting ? result?.judgement : undefined;
    const protagonistPose = judgement
      ? GAME_ASSETS.protagonist[judgement]
      : state === 'playing' && Math.floor(now / 260) % 2 === 1
        ? GAME_ASSETS.protagonist.walkB
        : GAME_ASSETS.protagonist.walkA;
    const mokaPose = judgement
      ? GAME_ASSETS.moka[judgement]
      : section === 'arrival' ? GAME_ASSETS.moka.tumbler : GAME_ASSETS.moka.deskCup;

    if (this.protagonist.texture.key !== protagonistPose.key) {
      this.protagonist.setTexture(protagonistPose.key);
    }
    if (this.moka.texture.key !== mokaPose.key) {
      this.moka.setTexture(mokaPose.key);
    }
  }
}
