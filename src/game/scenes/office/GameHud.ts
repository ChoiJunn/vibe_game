import Phaser from 'phaser';
import type { RhythmGameSnapshot } from '@/game/RhythmGameController';
import { getComboMultiplier } from '@/game/state/scorePolicy';

export function getHudProgress(snapshot: RhythmGameSnapshot): string {
  const status = snapshot.clockState === 'idle' ? 'READY' : snapshot.clockState.toUpperCase();
  return `${status} | ${snapshot.runState.nextEventIndex}/${snapshot.totalEvents}`;
}

export function getHudLines(snapshot: RhythmGameSnapshot): string[] {
  const { runState } = snapshot;
  const multiplier = getComboMultiplier(runState.combo).toFixed(1);
  return [
    `HEARTS  ${runState.hearts}/5`,
    `SCORE  ${runState.score.toString().padStart(5, '0')}   COMBO  ${runState.combo}   x${multiplier}`,
    getHudProgress(snapshot),
  ];
}

export class GameHud {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.panel = scene.add.graphics().setDepth(30).setScrollFactor(0);
    this.panel.fillStyle(0x182a31, 0.88).fillRoundedRect(48, 24, 590, 106, 18);
    this.panel.lineStyle(2, 0xfff1d2, 0.9).strokeRoundedRect(48, 24, 590, 106, 18);
    this.text = scene.add.text(70, 37, '', {
      color: '#fff8e9',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
    }).setDepth(31).setScrollFactor(0);
  }

  update(snapshot: RhythmGameSnapshot): void {
    this.text.setText(getHudLines(snapshot));
  }
}
