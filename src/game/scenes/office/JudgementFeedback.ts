import Phaser from 'phaser';
import type { Judgement } from '@/domain/rhythm';
import type { JudgementResult } from '@/game/judgement/types';

export class JudgementFeedback {
  private readonly text: Phaser.GameObjects.Text;
  lastResult?: JudgementResult;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
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
    const labels: Record<Judgement, { text: string; color: string }> = {
      perfect: { text: 'PERFECT', color: '#e6a82f' },
      good: { text: 'GOOD', color: '#2b7a78' },
      miss: { text: 'MISS', color: '#c94c4c' },
    };
    const feedback = labels[judgement];
    this.text.setText(feedback.text).setColor(feedback.color).setAlpha(1).setScale(1.15);
    this.scene.tweens.add({
      targets: this.text,
      alpha: 0,
      scale: 1,
      duration: 480,
      ease: 'Cubic.easeOut',
    });
  }
}
