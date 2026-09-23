import Phaser from "phaser";
import type { AudioClockState } from "@/game/audio/types";
import { GAME_ASSETS } from "@/game/assets";
import type { Judgement } from "@/domain/rhythm";

export function getWalkPoseKey(
  state: AudioClockState,
  songPositionMs: number,
): string | undefined {
  if (state !== "playing") {
    return undefined;
  }

  return Math.floor(songPositionMs / 272) % 2 === 0
    ? GAME_ASSETS.protagonist.walkA.key
    : GAME_ASSETS.protagonist.walkB.key;
}

export class OfficeCharacter {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly baseY: number;
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;
  private reactionActive = false;
  private feverActive = false;
  private lastWalkPoseKey: string = GAME_ASSETS.protagonist.walkA.key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.baseY = y;
    this.sprite = scene.add
      .image(x, y, GAME_ASSETS.protagonist.walkA.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(190, 190)
      .setDepth(11);
    this.baseScaleX = this.sprite.scaleX;
    this.baseScaleY = this.sprite.scaleY;
  }

  update(
    state: AudioClockState,
    songPositionMs: number,
    judgement?: Judgement,
    combo = 0,
    feverActive = false,
  ): void {
    this.setFever(feverActive);
    const poseKey = getWalkPoseKey(state, songPositionMs);
    if (
      !this.reactionActive &&
      poseKey &&
      this.sprite.texture.key !== poseKey
    ) {
      this.sprite.setTexture(poseKey);
      this.lastWalkPoseKey = poseKey;
    }
    const energyTier = getComboEnergyTier(combo);
    const walking = state === "playing";
    const bob = walking
      ? Math.sin((songPositionMs / 272) * Math.PI) *
        (2 + Math.min(energyTier, 5) * 1.2)
      : 0;
    this.sprite.setY(this.baseY + bob);
    if (judgement) this.react(judgement);
  }

  setFever(active: boolean): void {
    if (this.feverActive === active) return;
    this.feverActive = active;
    this.sprite.setTint(active ? 0xf0c7ff : 0xffffff);
    if (active) {
      this.sprite.setScale(this.baseScaleX * 1.04, this.baseScaleY * 1.04);
    } else if (!this.reactionActive) {
      this.sprite.setScale(this.baseScaleX, this.baseScaleY);
    }
  }

  react(judgement: Judgement): void {
    const pose = getCharacterReactionPose(judgement);
    this.reactionActive = true;
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    this.sprite
      .setTexture(getCharacterReactionAssetKey(judgement))
      .setRotation(0)
      .setScale(this.baseScaleX, this.baseScaleY);
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      rotation: pose.rotation,
      scaleX: this.baseScaleX * pose.scaleX,
      scaleY: this.baseScaleY * pose.scaleY,
      y: this.baseY + pose.yOffset,
      duration: pose.duration,
      yoyo: true,
      ease: pose.ease,
      onComplete: () => {
        this.reactionActive = false;
        this.sprite.setTexture(this.lastWalkPoseKey);
      },
    });
  }
}

export function getComboEnergyTier(combo: number): number {
  return Math.max(0, Math.floor(Math.max(0, combo) / 10));
}

export function getCharacterReactionPose(judgement: Judgement): {
  rotation: number;
  scaleX: number;
  scaleY: number;
  yOffset: number;
  duration: number;
  ease: string;
} {
  switch (judgement) {
    case "perfect":
      return {
        rotation: 0,
        scaleX: 1.08,
        scaleY: 1.12,
        yOffset: -18,
        duration: 220,
        ease: "Back.easeOut",
      };
    case "good":
      return {
        rotation: 0.08,
        scaleX: 1.02,
        scaleY: 0.96,
        yOffset: -4,
        duration: 190,
        ease: "Sine.easeInOut",
      };
    case "miss":
      return {
        rotation: -0.16,
        scaleX: 0.97,
        scaleY: 0.93,
        yOffset: 8,
        duration: 300,
        ease: "Sine.easeInOut",
      };
  }
}

export function getCharacterReactionAssetKey(judgement: Judgement): string {
  return GAME_ASSETS.protagonist[judgement].key;
}
