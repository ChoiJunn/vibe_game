import Phaser from 'phaser';
import type { NoteType, SectionId } from '@/domain/rhythm';
import type { AudioClockState } from '@/game/audio/types';

const SECTION_PROMPTS: Record<SectionId, string> = {
  arrival: '🚪 출근',
  keyboard: '⌨ 키보드',
  mail: '✉ 메일',
  meeting: '☕ 회의',
  copy: '▣ 복사',
  departure: '↗ 퇴근',
};

export class WorkIconPrompt {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add.text(x, y, '', {
      color: '#24323b',
      backgroundColor: '#ffffff',
      padding: { left: 22, right: 22, top: 12, bottom: 12 },
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  update(section: SectionId, noteType: NoteType | undefined, state: AudioClockState): void {
    const noteLabel = noteType === 'hold' ? '길게 누르기' : '누르기';
    const stateLabel = state === 'idle' ? '클릭해서 시작' : state === 'paused' ? '일시정지' : noteLabel;
    this.text.setText(`${SECTION_PROMPTS[section]} · ${stateLabel}`);
  }
}
