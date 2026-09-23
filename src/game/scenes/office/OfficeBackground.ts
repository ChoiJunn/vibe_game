import Phaser from "phaser";
import type { SectionId } from "@/domain/rhythm";
import { GAME_ASSETS } from "@/game/assets";
import type { Judgement } from "@/domain/rhythm";
import { getComboEnergyTier } from "./OfficeCharacter";

const BACKGROUND_WIDTH = 1333;
const BACKGROUND_HEIGHT = 750;
const CROSSFADE_DURATION_MS = 760;

export function getJourneyPanOffset(
  songPositionMs: number,
  combo = 0,
  missEnergy = 0,
): number {
  const tier = Math.min(getComboEnergyTier(combo), 6);
  const amplitude = 14 + tier * 1.5 - Math.max(0, Math.min(1, missEnergy)) * 5;
  return Math.sin((songPositionMs / 12_000) * Math.PI * 2) * amplitude;
}

export function getCrossfadeProgress(
  songPositionMs: number,
  startedAtMs: number,
): number {
  return Math.max(
    0,
    Math.min(1, (songPositionMs - startedAtMs) / CROSSFADE_DURATION_MS),
  );
}

export function isFeverActiveAt(songPositionMs: number, feverActiveUntilMs: number): boolean {
  return feverActiveUntilMs > songPositionMs;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export class OfficeBackground {
  private readonly current: Phaser.GameObjects.Image;
  private readonly incoming: Phaser.GameObjects.Image;
  private section: SectionId = "arrival";
  private transitionStartedAtMs?: number;
  private transitionTargetKey = GAME_ASSETS.backgrounds.arrival.key;
  private missStartedAtMs?: number;
  private readonly feverOverlay: Phaser.GameObjects.Graphics;
  private readonly feverLabel: Phaser.GameObjects.Text;
  private feverActive = false;

  constructor(scene: Phaser.Scene) {
    this.current = scene.add
      .image(0, 0, GAME_ASSETS.backgrounds.arrival.key)
      .setOrigin(0)
      .setDisplaySize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
      .setDepth(-10);
    this.incoming = scene.add
      .image(0, 0, GAME_ASSETS.backgrounds.arrival.key)
      .setOrigin(0)
      .setDisplaySize(BACKGROUND_WIDTH, BACKGROUND_HEIGHT)
      .setAlpha(0)
      .setDepth(-9);
    this.feverOverlay = scene.add.graphics().setDepth(-2).setScrollFactor(0).setAlpha(0);
    this.feverOverlay.fillStyle(0x6e3ec2, 0.28).fillRect(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);
    this.feverOverlay.lineStyle(5, 0xff8fe7, 0.7);
    this.feverOverlay.strokeRect(28, 28, BACKGROUND_WIDTH - 56, BACKGROUND_HEIGHT - 56);
    this.feverLabel = scene.add.text(BACKGROUND_WIDTH - 56, 34, "FEVER!!", {
      color: "#ffe5ff",
      fontFamily: "Arial, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
      stroke: "#3c1d58",
      strokeThickness: 6,
    }).setOrigin(1, 0).setDepth(25).setScrollFactor(0).setAlpha(0);
  }

  update(
    section: SectionId,
    songPositionMs: number,
    combo = 0,
    lastJudgement?: Judgement,
    feverActiveUntilMs = 0,
  ): void {
    if (lastJudgement === "miss") this.missStartedAtMs = songPositionMs;
    if (section !== this.section) {
      this.section = section;
      this.transitionTargetKey = GAME_ASSETS.backgrounds[section].key;
      this.incoming.setTexture(this.transitionTargetKey).setAlpha(0);
      this.transitionStartedAtMs = songPositionMs;
    }

    const missEnergy =
      this.missStartedAtMs === undefined
        ? 0
        : Math.max(0, 1 - (songPositionMs - this.missStartedAtMs) / 1_200);
    const pan = getJourneyPanOffset(songPositionMs, combo, missEnergy);
    this.current.setPosition(-26.5 + pan, -15);
    this.incoming.setPosition(-26.5 + pan, -15);
    this.updateFever(songPositionMs, feverActiveUntilMs);

    if (this.transitionStartedAtMs === undefined) {
      return;
    }

    const progress = getCrossfadeProgress(
      songPositionMs,
      this.transitionStartedAtMs,
    );
    this.current.setAlpha(1 - progress);
    this.incoming.setAlpha(progress);

    if (progress >= 1) {
      this.current.setTexture(this.transitionTargetKey).setAlpha(1);
      this.incoming.setAlpha(0);
      this.transitionStartedAtMs = undefined;
    }
  }

  private updateFever(songPositionMs: number, feverActiveUntilMs: number): void {
    const active = isFeverActiveAt(songPositionMs, feverActiveUntilMs);
    if (active === this.feverActive) return;
    this.feverActive = active;
    const alpha = active ? 1 : 0;
    if (prefersReducedMotion()) {
      this.feverOverlay.setAlpha(active ? 0.9 : 0);
      this.feverLabel.setAlpha(active ? 1 : 0);
      return;
    }
    this.feverOverlay.scene.tweens.add({ targets: this.feverOverlay, alpha: active ? 0.9 : 0, duration: 420, ease: "Sine.easeInOut" });
    this.feverLabel.scene.tweens.add({ targets: this.feverLabel, alpha, duration: 260, ease: "Sine.easeInOut" });
  }
}
