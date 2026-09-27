import Phaser from "phaser";
import type { AudioClockState } from "@/game/audio/types";
import { GAME_ASSETS } from "@/game/assets";
import type { Judgement } from "@/domain/rhythm";

const BASE_CHARACTER_WIDTH = 190;
const BASE_CHARACTER_HEIGHT = 190;
const FEVER_CHARACTER_WIDTH = 150;
const FEVER_CHARACTER_HEIGHT = 225;

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

export function fitImageToFootprint(
  sprite: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number,
): void {
  const source = sprite.texture.getSourceImage() as { width: number; height: number };
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
  sprite.setScale(scale);
}

export class OfficeCharacter {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly baseY: number;
  private reactionActive = false;
  private feverActive = false;
  private lastWalkPoseKey: string = GAME_ASSETS.protagonist.walkA.key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.baseY = y;
    this.sprite = scene.add
      .image(x, y, GAME_ASSETS.protagonist.walkA.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(BASE_CHARACTER_WIDTH, BASE_CHARACTER_HEIGHT)
      .setDepth(11);
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
      !this.feverActive &&
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
    this.sprite.setTint(0xffffff);
    if (active) {
      this.sprite.setTexture(GAME_ASSETS.protagonist.fever.key);
      fitImageToFootprint(this.sprite, FEVER_CHARACTER_WIDTH, FEVER_CHARACTER_HEIGHT);
    } else if (!this.reactionActive) {
      this.sprite.setTexture(this.lastWalkPoseKey);
      this.sprite.setDisplaySize(BASE_CHARACTER_WIDTH, BASE_CHARACTER_HEIGHT);
    }
  }

  react(judgement: Judgement): void {
    const pose = getCharacterReactionPose(judgement);
    const feverReaction = this.feverActive;
    this.reactionActive = true;
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    this.sprite
      .setTexture(getCharacterReactionAssetKey(judgement, feverReaction))
      .setRotation(0);
    if (feverReaction) {
      fitImageToFootprint(this.sprite, FEVER_CHARACTER_WIDTH, FEVER_CHARACTER_HEIGHT);
    } else {
      this.sprite.setDisplaySize(BASE_CHARACTER_WIDTH, BASE_CHARACTER_HEIGHT);
    }
    const initialScaleX = this.sprite.scaleX;
    const initialScaleY = this.sprite.scaleY;
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      rotation: pose.rotation,
      scaleX: initialScaleX * pose.scaleX,
      scaleY: initialScaleY * pose.scaleY,
      y: this.baseY + pose.yOffset,
      duration: pose.duration,
      yoyo: true,
      ease: pose.ease,
      onComplete: () => {
        this.reactionActive = false;
        this.sprite.setRotation(0);
        this.sprite.setTexture(
          this.feverActive ? GAME_ASSETS.protagonist.fever.key : this.lastWalkPoseKey,
        );
        if (this.feverActive) {
          fitImageToFootprint(this.sprite, FEVER_CHARACTER_WIDTH, FEVER_CHARACTER_HEIGHT);
        } else {
          this.sprite.setDisplaySize(BASE_CHARACTER_WIDTH, BASE_CHARACTER_HEIGHT);
        }
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

export function getCharacterReactionAssetKey(
  judgement: Judgement,
  feverActive = false,
): string {
  if (!feverActive) return GAME_ASSETS.protagonist[judgement].key;
  return GAME_ASSETS.protagonist[`fever${judgement[0].toUpperCase()}${judgement.slice(1)}` as "feverGood" | "feverPerfect" | "feverMiss"].key;
}
