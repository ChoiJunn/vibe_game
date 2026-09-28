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

type MokaForm = "tumbler" | "deskCup";

function getMokaAssetKeyForForm(
  form: MokaForm,
  judgement?: Judgement,
  feverActive = false,
): string {
  if (form === "tumbler") {
    if (!judgement) {
      return (feverActive ? GAME_ASSETS.moka.tumblerFever : GAME_ASSETS.moka.tumbler).key;
    }
    if (feverActive) {
      switch (judgement) {
        case "perfect": return GAME_ASSETS.moka.tumblerFeverPerfect.key;
        case "good": return GAME_ASSETS.moka.tumblerFeverGood.key;
        case "miss": return GAME_ASSETS.moka.tumblerFeverMiss.key;
      }
    }
    switch (judgement) {
      case "perfect": return GAME_ASSETS.moka.tumblerPerfect.key;
      case "good": return GAME_ASSETS.moka.tumblerGood.key;
      case "miss": return GAME_ASSETS.moka.tumblerMiss.key;
    }
  }

  if (!judgement) {
    return (feverActive ? GAME_ASSETS.moka.fever : GAME_ASSETS.moka.deskCup).key;
  }
  if (feverActive) {
    switch (judgement) {
      case "perfect": return GAME_ASSETS.moka.feverPerfect.key;
      case "good": return GAME_ASSETS.moka.feverGood.key;
      case "miss": return GAME_ASSETS.moka.feverMiss.key;
    }
  }
  switch (judgement) {
    case "perfect": return GAME_ASSETS.moka.perfect.key;
    case "good": return GAME_ASSETS.moka.good.key;
    case "miss": return GAME_ASSETS.moka.miss.key;
  }
}

export function getMokaDisplayAssetKey(
  section: SectionId,
  judgement?: Judgement,
  feverActive = false,
): string {
  return getMokaAssetKeyForForm(getMokaForm(section), judgement, feverActive);
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
  private currentSection: SectionId = "arrival";

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
    const form = getMokaForm(section);
    this.currentSection = section;
    this.setFever(feverActive);
    const carried = form === "tumbler";
    const size = getMokaSize(section, combo);
    this.sprite.setPosition(
      carried ? this.carryX : this.deskX,
      carried ? this.carryY : this.deskY,
    );
    fitImageToFootprint(this.sprite, size, size);
    const desiredAssetKey = getMokaDisplayAssetKey(section, undefined, this.feverActive);
    if (!this.reactionActive && this.sprite.texture.key !== desiredAssetKey) {
      this.sprite.setTexture(desiredAssetKey);
    }
    if (judgement) this.react(judgement);
  }

  setFever(active: boolean): void {
    if (this.feverActive === active) return;
    this.feverActive = active;
    this.sprite.setTint(0xffffff);
    if (this.reactionActive) return;
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setTexture(getMokaDisplayAssetKey(this.currentSection, undefined, active));
    if (active) {
      this.sprite.scene.tweens.add({ targets: this.sprite, angle: { from: -5, to: 5 }, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else {
      this.sprite.setAngle(0);
    }
  }

  react(judgement: Judgement): void {
    const rotation =
      judgement === "perfect" ? 0.16 : judgement === "good" ? 0.1 : -0.22;
    this.reactionActive = true;
    this.sprite.scene.tweens.killTweensOf(this.sprite);
    const feverReaction = this.feverActive;
    this.sprite.setTexture(getMokaDisplayAssetKey(this.currentSection, judgement, feverReaction)).setRotation(0);
    this.sprite.scene.tweens.add({
      targets: this.sprite,
      rotation,
      duration: judgement === "miss" ? 340 : 240,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.reactionActive = false;
        this.sprite.setTexture(getMokaDisplayAssetKey(this.currentSection, undefined, this.feverActive));
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
  form: MokaForm = "deskCup",
): string {
  return getMokaAssetKeyForForm(form, judgement, feverActive);
}
