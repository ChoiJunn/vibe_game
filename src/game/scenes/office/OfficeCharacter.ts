import Phaser from 'phaser';
import type { AudioClockState } from '@/game/audio/types';
import type { Judgement } from '@/domain/rhythm';

export class OfficeCharacter {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private lastJudgement?: Judgement;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.graphics = scene.add.graphics();
    this.label = scene.add.text(x, y + 92, '업무 담당자', {
      color: '#24323b',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
    }).setOrigin(0.5);
    this.draw(x, y, 1);
  }

  update(state: AudioClockState, judgement?: Judgement): void {
    if (judgement && judgement !== this.lastJudgement) {
      this.lastJudgement = judgement;
      this.draw(640, 430, judgement === 'miss' ? 0.94 : 1.06);
    } else if (state === 'playing') {
      this.draw(640, 430, 1);
    }
  }

  private draw(x: number, y: number, scale: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(0x263742, 1);
    this.graphics.fillCircle(x, y - 55 * scale, 32 * scale);
    this.graphics.fillStyle(0xf2b880, 1);
    this.graphics.fillCircle(x, y - 55 * scale, 24 * scale);
    this.graphics.fillStyle(0x4d6a7a, 1);
    this.graphics.fillRoundedRect(x - 48 * scale, y - 22 * scale, 96 * scale, 100 * scale, 22);
    this.graphics.fillStyle(0xf2b880, 1);
    this.graphics.fillCircle(x - 56 * scale, y + 2 * scale, 12 * scale);
    this.graphics.fillCircle(x + 56 * scale, y + 2 * scale, 12 * scale);
  }
}
