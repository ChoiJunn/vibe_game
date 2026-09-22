import { describe, expect, it } from 'vitest';
import { getMokaForm } from './MokaCompanion';
import { getWalkPoseKey } from './OfficeCharacter';
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
});
