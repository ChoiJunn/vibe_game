import { describe, expect, it } from 'vitest';
import { getMokaDisplayAssetKey, getMokaForm, getMokaReactionAssetKey, getMokaSize, MokaCompanion } from './MokaCompanion';
import { getCharacterReactionAssetKey, getCharacterReactionPose, getComboEnergyTier, getWalkPoseKey } from './OfficeCharacter';
import { GAME_ASSETS } from '@/game/assets';

describe('Office journey characters', () => {
  it('animates walking from the song clock and holds the last pose while paused', () => {
    expect(getWalkPoseKey('playing', 0)).toBe(GAME_ASSETS.protagonist.walkA.key);
    expect(getWalkPoseKey('playing', 272)).toBe(GAME_ASSETS.protagonist.walkB.key);
    expect(getWalkPoseKey('paused', 1_000)).toBeUndefined();
    expect(getWalkPoseKey('idle', 1_000)).toBeUndefined();
  });

  it('carries Moka during arrival and departure and uses the desk cup indoors', () => {
    expect(getMokaForm('arrival')).toBe('tumbler');
    expect(getMokaForm('keyboard')).toBe('deskCup');
    expect(getMokaForm('mail')).toBe('deskCup');
    expect(getMokaForm('meeting')).toBe('deskCup');
    expect(getMokaForm('copy')).toBe('deskCup');
    expect(getMokaForm('departure')).toBe('tumbler');
  });

  it.each([
    ['arrival', true],
    ['keyboard', false],
    ['mail', false],
    ['meeting', false],
    ['copy', false],
    ['departure', true],
  ] as const)('%s keeps its cup form across all judgement and Fever states', (section, isTumbler) => {
    const form = isTumbler ? 'tumbler' : 'deskCup';
    const judgements = ['perfect', 'good', 'miss'] as const;
    const expected = {
      idle: isTumbler ? GAME_ASSETS.moka.tumbler.key : GAME_ASSETS.moka.deskCup.key,
      feverIdle: isTumbler ? GAME_ASSETS.moka.tumblerFever.key : GAME_ASSETS.moka.fever.key,
      perfect: isTumbler ? GAME_ASSETS.moka.tumblerPerfect.key : GAME_ASSETS.moka.perfect.key,
      good: isTumbler ? GAME_ASSETS.moka.tumblerGood.key : GAME_ASSETS.moka.good.key,
      miss: isTumbler ? GAME_ASSETS.moka.tumblerMiss.key : GAME_ASSETS.moka.miss.key,
      feverPerfect: isTumbler ? GAME_ASSETS.moka.tumblerFeverPerfect.key : GAME_ASSETS.moka.feverPerfect.key,
      feverGood: isTumbler ? GAME_ASSETS.moka.tumblerFeverGood.key : GAME_ASSETS.moka.feverGood.key,
      feverMiss: isTumbler ? GAME_ASSETS.moka.tumblerFeverMiss.key : GAME_ASSETS.moka.feverMiss.key,
    };

    expect(getMokaDisplayAssetKey(section)).toBe(expected.idle);
    expect(getMokaDisplayAssetKey(section, undefined, true)).toBe(expected.feverIdle);
    for (const judgement of judgements) {
      expect(getMokaDisplayAssetKey(section, judgement)).toBe(expected[judgement]);
      expect(getMokaDisplayAssetKey(section, judgement, true)).toBe(expected[`fever${judgement[0].toUpperCase()}${judgement.slice(1)}` as 'feverPerfect' | 'feverGood' | 'feverMiss']);
      expect(getMokaReactionAssetKey(judgement, false, form)).toBe(expected[judgement]);
      expect(getMokaReactionAssetKey(judgement, true, form)).toBe(expected[`fever${judgement[0].toUpperCase()}${judgement.slice(1)}` as 'feverPerfect' | 'feverGood' | 'feverMiss']);
    }
  });

  it('restores the latest section and Fever texture after an in-flight judgement', () => {
    const tweens: Array<{ targets: unknown; onComplete?: () => void }> = [];
    const image = {
      texture: { key: '', getSourceImage: () => ({ width: 128, height: 128 }) },
      scene: { tweens: {
        add: (config: { targets: unknown; onComplete?: () => void }) => tweens.push(config),
        killTweensOf: () => undefined,
      } },
      setOrigin() { return this; },
      setDisplaySize() { return this; },
      setDepth() { return this; },
      setPosition() { return this; },
      setScale() { return this; },
      setTexture(key: string) { this.texture.key = key; return this; },
      setTint() { return this; },
      setRotation() { return this; },
      setAngle() { return this; },
    };
    const scene = { add: { image: () => image } } as never;
    const moka = new MokaCompanion(scene, 320, 690);

    moka.update('arrival', 'good', 0, false);
    expect(image.texture.key).toBe(GAME_ASSETS.moka.tumblerGood.key);
    const reactionTween = tweens.at(-1);

    moka.update('keyboard', undefined, 0, true);
    expect(image.texture.key).toBe(GAME_ASSETS.moka.tumblerGood.key);
    reactionTween?.onComplete?.();

    expect(image.texture.key).toBe(GAME_ASSETS.moka.fever.key);
  });

  it('raises cosmetic liveliness at each ten-combo tier', () => {
    expect([0, 9, 10, 20].map(getComboEnergyTier)).toEqual([0, 0, 1, 2]);
    expect(getMokaSize('keyboard', 20)).toBeGreaterThan(getMokaSize('keyboard', 9));
  });

  it('uses distinct non-color poses for Perfect, Good, and Miss', () => {
    expect(getCharacterReactionPose('perfect').yOffset).toBeLessThan(0);
    expect(getCharacterReactionPose('good').rotation).toBeGreaterThan(0);
    expect(getCharacterReactionPose('miss').yOffset).toBeGreaterThan(0);
    expect(getCharacterReactionAssetKey('perfect')).toBe(GAME_ASSETS.protagonist.perfect.key);
    expect(getCharacterReactionAssetKey('miss')).toBe(GAME_ASSETS.protagonist.miss.key);
    expect(getCharacterReactionAssetKey('perfect', true)).toBe(GAME_ASSETS.protagonist.feverPerfect.key);
    expect(getCharacterReactionAssetKey('good', true)).toBe(GAME_ASSETS.protagonist.feverGood.key);
    expect(getCharacterReactionAssetKey('miss', true)).toBe(GAME_ASSETS.protagonist.feverMiss.key);
    expect(getMokaReactionAssetKey('good')).toBe(GAME_ASSETS.moka.good.key);
    expect(getMokaReactionAssetKey('miss')).toBe(GAME_ASSETS.moka.miss.key);
    expect(getMokaReactionAssetKey('perfect', true)).toBe(GAME_ASSETS.moka.feverPerfect.key);
    expect(getMokaReactionAssetKey('good', true)).toBe(GAME_ASSETS.moka.feverGood.key);
    expect(getMokaReactionAssetKey('miss', true)).toBe(GAME_ASSETS.moka.feverMiss.key);
  });
});
