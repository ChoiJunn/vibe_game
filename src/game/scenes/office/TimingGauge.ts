import Phaser from 'phaser';
import type { RhythmEvent } from '@/domain/rhythm';

export class TimingGauge {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.graphics = scene.add.graphics();
    this.label = scene.add.text(x, y - 38, 'TIMING', {
      color: '#24323b',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  update(event: RhythmEvent | undefined, songPositionMs: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 0.8);
    this.graphics.fillRoundedRect(this.x - this.width / 2, this.y, this.width, 20, 10);
    this.graphics.fillStyle(0x263742, 1);
    this.graphics.fillRect(this.x - 2, this.y - 10, 4, 40);

    if (!event) {
      return;
    }

    const windowStart = event.startMs - 160;
    const windowEnd = (event.endMs ?? event.startMs) + 160;
    const progress = Math.max(0, Math.min(1, (songPositionMs - windowStart) / Math.max(1, windowEnd - windowStart)));
    this.graphics.fillStyle(0x7057b8, 1);
    this.graphics.fillCircle(this.x - this.width / 2 + progress * this.width, this.y + 10, 8);
  }
}
