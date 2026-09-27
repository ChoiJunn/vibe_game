import Phaser from "phaser";
import type { SectionId } from "@/domain/rhythm";
import { GAME_ASSETS } from "@/game/assets";
import type { Judgement } from "@/domain/rhythm";
import { fitImageToFootprint, getComboEnergyTier } from "./OfficeCharacter";

export function getMokaForm(section: SectionId): "tumbler" | "deskCup" {
  return section === "arrival" || section === "departure"
    ? "tumbler"
    : "deskCup";
}

export function getMokaSize(section: SectionId, combo: number): number {
  return getMokaForm(section) === "tumbler"
    ? 72
    : 112 + Math.min(getComboEnergyTier(combo), 6) * 4;
}

export class MokaCompanion {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly carryX: number;
  private readonly carryY: number;
  private readonly deskX: number;
  private readonly deskY: number;
  private reactionActive = false;
  private feverActive = false;
  private currentForm: "tumbler" | "deskCup" = "tumbler";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.carryX = x - 64;
    this.carryY = y - 46;
    this.deskX = x + 405;
    this.deskY = y;
    this.sprite = scene.add
      .image(this.carryX, this.carryY, GAME_ASSETS.moka.tumbler.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(72, 72)
      .setDepth(11);
  }

  update(
    section: SectionId,
    judgement: Judgement | undefined,
    combo: number,
    feverActive = false,
  ): void {
    this.setFever(feverActive);
    const form = getMokaForm(section);
    this.currentForm = form;
    const asset = GAME_ASSETS.moka[form];
    const carried = form === "tumbler";
    const size = getMokaSize(section, combo);
    this.sprite.setPosition(
      carried ? this.carryX : this.deskX,
      carried ? this.carryY : this.deskY,
    );
    fitImageToFootprint(this.sprite, size, size);
    const desiredAsset = this.feverActive ? GAME_ASSETS.moka.fever : asset;
    if (!this.reactionActive && this.sprite.texture.key !== desiredAsset.key) {
      this.sprite.setTexture(desiredAsset.key);
    }
    if (judgement) this.react(judgement);
  }

  setFever(active: boolean): void {
    if (this.feverActive === active) return;
    this.feverActive = active;
    this.sprite.setTint(0xffffff);
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    if (active) {
      this.sprite.setTexture(GAME_ASSETS.moka.fever.key);
      this.sprite.scene.tweens.add({ targets: this.sprite, angle: { from: -5, to: 5 }, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else if (!this.reactionActive) {
      this.sprite.setAngle(0);
      this.sprite.setTexture(GAME_ASSETS.moka[this.currentForm].key);
    }
  }

  react(judgement: Judgement): void {
    const rotation =
      judgement === "perfect" ? 0.16 : judgement === "good" ? 0.1 : -0.22;
    this.reactionActive = true;
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    const feverReaction = this.feverActive;
    this.sprite.setTexture(getMokaReactionAssetKey(judgement, feverReaction)).setRotation(0);
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      rotation,
      duration: judgement === "miss" ? 340 : 240,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.reactionActive = false;
        this.sprite.setTexture(
          this.feverActive ? GAME_ASSETS.moka.fever.key : GAME_ASSETS.moka[this.currentForm].key,
        );
        if (this.feverActive) {
          this.sprite.scene.tweens.add({ targets: this.sprite, angle: { from: -5, to: 5 }, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      },
    });
  }
}

export function getMokaReactionAssetKey(
  judgement: Judgement,
  feverActive = false,
): string {
  if (!feverActive) return GAME_ASSETS.moka[judgement].key;
  return GAME_ASSETS.moka[`fever${judgement[0].toUpperCase()}${judgement.slice(1)}` as "feverGood" | "feverPerfect" | "feverMiss"].key;
}
