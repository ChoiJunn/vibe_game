import Phaser from "phaser";
import type { NoteType, RhythmEvent, SectionId } from "@/domain/rhythm";
import type { AudioClockState } from "@/game/audio/types";
import { GAME_ASSETS } from "@/game/assets";

const SECTION_PROMPTS: Record<SectionId, string> = {
  arrival: "출근길 · 발걸음",
  keyboard: "업무 시작 · 키보드",
  mail: "메일 확인 · 편지",
  meeting: "회의 · 대화",
  copy: "복사 · 종이",
  departure: "퇴근 · 귀가",
};

export class WorkIconPrompt {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.icon = scene.add
      .image(x, y, GAME_ASSETS.notes.arrival.key)
      .setDisplaySize(92, 92)
      .setDepth(4);
    this.text = scene.add
      .text(x, y + 62, "", {
        color: "#24323b",
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#fff8e9",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  update(
    section: SectionId,
    noteType: NoteType | undefined,
    state: AudioClockState,
    event?: RhythmEvent,
  ): void {
    this.icon.setTexture(GAME_ASSETS.notes[section].key);
    const patternHint = event?.patternKind === "offbeat"
      ? " · SHIFT"
      : event?.patternKind === "transition"
        ? " · ➜"
        : event?.type === "burst"
          ? " · BURST ⚡"
          : "";
    const instruction =
      state === "idle"
        ? "스페이스를 눌러 시작"
        : state === "paused"
          ? "일시정지"
          : noteType === "hold"
            ? "길게 누르기"
            : "스페이스로 박자 맞추기";
    this.text.setText(`${SECTION_PROMPTS[section]} · ${instruction}${patternHint}`);
  }
}
