import Phaser from 'phaser';
import type { Judgement } from '@/domain/rhythm';
import type { JudgementResult } from '@/game/judgement/types';

export class JudgementFeedback {
  private readonly text: Phaser.GameObjects.Text;
  private readonly originY: number;
  lastEventId?: string;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.originY = y;
    this.text = scene.add.text(x, y, '', {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      stroke: '#24323b',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
  }

  show(judgement: Judgement): void {
    const feedback = getJudgementCue(judgement);
    this.scene.tweens.killTweensOf(this.text);
    this.text.setText(feedback.label).setColor(feedback.color).setAlpha(1).setScale(feedback.startScale).setY(this.originY);
    this.scene.tweens.add({
      targets: this.text,
      alpha: 0,
      scale: 1,
      y: this.originY + feedback.rise,
      duration: feedback.duration,
      ease: feedback.ease,
    });
  }
}

export function getJudgementCue(judgement: Judgement): {
  label: string;
  color: string;
  startScale: number;
  rise: number;
  duration: number;
  ease: string;
} {
  switch (judgement) {
    case 'perfect': return { label: 'PERFECT  *', color: '#f3bf54', startScale: 0.72, rise: -26, duration: 620, ease: 'Back.easeOut' };
    case 'good': return { label: 'GOOD  +', color: '#79c7ad', startScale: 0.9, rise: -12, duration: 520, ease: 'Cubic.easeOut' };
    case 'miss': return { label: 'MISS  !', color: '#f08f83', startScale: 1.05, rise: 16, duration: 680, ease: 'Sine.easeOut' };
  }
}

export function isNewJudgementEvent(lastEventId: string | undefined, result: JudgementResult | undefined): result is JudgementResult {
  return Boolean(result && result.eventId !== lastEventId);
}
