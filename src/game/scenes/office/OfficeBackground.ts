import Phaser from 'phaser';
import type { SectionId } from '@/domain/rhythm';

const SECTION_COLORS: Record<SectionId, { background: number; accent: number }> = {
  arrival: { background: 0xf7d9b4, accent: 0xc66a3d },
  keyboard: { background: 0xcde7e5, accent: 0x2b7a78 },
  mail: { background: 0xf7e8ad, accent: 0xd6952c },
  meeting: { background: 0xd7d2f3, accent: 0x7057b8 },
  copy: { background: 0xe6d5c3, accent: 0x8c5f45 },
  departure: { background: 0xb9d6ea, accent: 0x3d6e9e },
};

export class OfficeBackground extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(-10);
  }
}

export function renderOfficeBackground(graphics: OfficeBackground, section: SectionId): void {
  const colors = SECTION_COLORS[section];
  graphics.clear();
  graphics.fillStyle(colors.background, 1);
  graphics.fillRect(0, 0, 1280, 720);
  graphics.fillStyle(0xffffff, 0.3);
  graphics.fillCircle(1080, 150, 180);
  graphics.fillStyle(colors.accent, 0.2);
  graphics.fillRect(0, 530, 1280, 190);
  graphics.lineStyle(4, colors.accent, 0.65);
  graphics.strokeRect(70, 90, 1140, 500);
  graphics.fillStyle(0x684c3a, 1);
  graphics.fillRect(220, 480, 840, 35);
  graphics.fillStyle(0x9b6d4f, 1);
  graphics.fillRect(260, 515, 24, 140);
  graphics.fillRect(996, 515, 24, 140);
}
