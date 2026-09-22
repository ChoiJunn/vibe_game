import Phaser from 'phaser';
import type { RhythmGameSnapshot } from '@/game/RhythmGameController';
import { getComboMultiplier } from '@/game/state/scorePolicy';

export function getHudProgress(snapshot: RhythmGameSnapshot): string {
  const status = snapshot.clockState === 'idle' ? 'READY' : snapshot.clockState.toUpperCase();
  return `${status}  ·  ${snapshot.runState.nextEventIndex}/${snapshot.totalEvents}`;
}

export class GameHud {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(70, 36, '', {
      color: '#24323b',
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
    });
  }

  update(snapshot: RhythmGameSnapshot): void {
    const { runState } = snapshot;
    const multiplier = getComboMultiplier(runState.combo).toFixed(1);
    this.text.setText([
      `HEARTS  ${'♥'.repeat(runState.hearts)}${'♡'.repeat(Math.max(0, 5 - runState.hearts))}`,
      `SCORE  ${runState.score.toString().padStart(5, '0')}   COMBO  ${runState.combo}   x${multiplier}`,
      getHudProgress(snapshot),
    ]);
  }
}
