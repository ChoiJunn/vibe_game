import { describe, expect, it } from 'vitest';
import { getMokaForm, getMokaSize } from './MokaCompanion';
import { getCharacterReactionPose, getComboEnergyTier, getWalkPoseKey } from './OfficeCharacter';
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

  it('raises cosmetic liveliness at each ten-combo tier', () => {
    expect([0, 9, 10, 20].map(getComboEnergyTier)).toEqual([0, 0, 1, 2]);
    expect(getMokaSize('keyboard', 20)).toBeGreaterThan(getMokaSize('keyboard', 9));
  });

  it('uses distinct non-color poses for Perfect, Good, and Miss', () => {
    expect(getCharacterReactionPose('perfect').yOffset).toBeLessThan(0);
    expect(getCharacterReactionPose('good').rotation).toBeGreaterThan(0);
    expect(getCharacterReactionPose('miss').yOffset).toBeGreaterThan(0);
  });
});
