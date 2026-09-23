import Phaser from "phaser";
import type { RhythmGameSnapshot } from "@/game/RhythmGameController";
import { getComboMultiplier } from "@/game/state/scorePolicy";

export function getHudProgress(snapshot: RhythmGameSnapshot): string {
  const status =
    snapshot.clockState === "idle"
      ? "READY"
      : snapshot.clockState.toUpperCase();
  return `${status} | ${snapshot.runState.nextEventIndex}/${snapshot.totalEvents}`;
}

export function getHudLines(snapshot: RhythmGameSnapshot): string[] {
  const { runState } = snapshot;
  const multiplier = getComboMultiplier(runState.combo).toFixed(1);
  const lines = [
    `HEARTS  ${runState.hearts}/5`,
    `SCORE  ${runState.score.toString().padStart(5, "0")}   COMBO  ${runState.combo}   x${multiplier}`,
    getHudProgress(snapshot),
  ];
  if (typeof runState.riskBonusRemaining === "number") {
    const feverSeconds = getFeverSecondsRemaining(snapshot);
    lines.push(`RISK  x2 ${runState.riskBonusRemaining}회   FEVER  ${Math.round(runState.feverGauge)}%${feverSeconds > 0 ? `  ${feverSeconds}s` : ""}`);
  }
  return lines;
}

export function isFeverActive(snapshot: RhythmGameSnapshot): boolean {
  return snapshot.runState.feverActiveUntilMs > snapshot.songPositionMs;
}

export function getFeverSecondsRemaining(snapshot: RhythmGameSnapshot): number {
  return Math.max(0, Math.ceil((snapshot.runState.feverActiveUntilMs - snapshot.songPositionMs) / 1000));
}

export class GameHud {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly feverBanner: Phaser.GameObjects.Graphics;
  private readonly feverText: Phaser.GameObjects.Text;
  private readonly feverGauge: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.panel = scene.add.graphics().setDepth(30).setScrollFactor(0);
    this.drawPanel(false);
    this.text = scene.add
      .text(70, 37, "", {
        color: "#fff8e9",
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setDepth(31)
      .setScrollFactor(0);
    this.feverBanner = scene.add.graphics().setDepth(30).setScrollFactor(0);
    this.feverText = scene.add.text(875, 38, "", {
      color: "#fff8e9",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      fontStyle: "bold",
    }).setDepth(31).setScrollFactor(0);
    this.feverGauge = scene.add.graphics().setDepth(31).setScrollFactor(0);
  }

  update(snapshot: RhythmGameSnapshot): void {
    const fever = isFeverActive(snapshot);
    this.drawPanel(typeof snapshot.runState.riskBonusRemaining === "number", fever);
    this.text.setText(getHudLines(snapshot));
    this.text.setColor(fever ? "#fbe7ff" : "#fff8e9");
    const seconds = getFeverSecondsRemaining(snapshot);
    const gauge = Math.max(0, Math.min(100, snapshot.runState.feverGauge ?? 0));
    this.feverBanner.clear();
    this.feverBanner.fillStyle(fever ? 0x8f35bd : 0x182a31, fever ? 0.96 : 0.86);
    this.feverBanner.lineStyle(2, fever ? 0xffa8ef : 0xfff1d2, 0.9);
    this.feverBanner.fillRoundedRect(850, 24, 270, 56, 16);
    this.feverBanner.strokeRoundedRect(850, 24, 270, 56, 16);
    this.feverText.setText(fever ? `FEVER  ${seconds}.0s  ×1.5` : `FEVER CHARGE  ${Math.round(gauge)}%`);
    this.feverText.setColor(fever ? "#fff0ff" : "#fff8e9");
    this.feverGauge.clear();
    this.feverGauge.fillStyle(0x493a58, 0.9).fillRoundedRect(866, 66, 238, 5, 3);
    this.feverGauge.fillStyle(fever ? 0xff9ee8 : 0xffd46f, 1).fillRoundedRect(866, 66, 238 * (fever ? 1 : gauge / 100), 5, 3);
  }

  private drawPanel(showRisk: boolean, fever = false): void {
    const height = showRisk ? 138 : 106;
    this.panel.clear();
    this.panel.fillStyle(fever ? 0x321d55 : 0x182a31, 0.9).fillRoundedRect(48, 24, 590, height, 18);
    this.panel.lineStyle(2, fever ? 0xff9ee8 : 0xfff1d2, 0.9).strokeRoundedRect(48, 24, 590, height, 18);
  }
}
