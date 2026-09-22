import { describe, expect, it } from 'vitest';
import type { RhythmEvent } from '@/domain/rhythm';
import { GAME_ASSETS } from '@/game/assets';
import { getNoteAssetKey, isLaneEventVisible, projectLaneEvent, resolveLaneOptions } from './RhythmLane';

const tap: RhythmEvent = { id: 'tap-1', type: 'tap', startMs: 4_000, section: 'mail' };
const hold: RhythmEvent = { id: 'hold-1', type: 'hold', startMs: 4_000, endMs: 5_000, section: 'keyboard' };

describe('RhythmLane projection', () => {
  it('keeps a fixed marker in the lower third and moves notes right-to-left', () => {
    expect(resolveLaneOptions()).toMatchObject({ hitX: 640, y: 520 });
    expect(projectLaneEvent(tap, 1_600).startX).toBe(1_160);
    expect(projectLaneEvent(tap, 2_800).startX).toBe(900);
    expect(projectLaneEvent(tap, 4_000).startX).toBe(640);
  });

  it('keeps notes within the travel/late visibility edges', () => {
    expect(isLaneEventVisible(tap, 1_600)).toBe(true);
    expect(isLaneEventVisible(tap, 1_599)).toBe(false);
    expect(isLaneEventVisible(tap, 4_160)).toBe(true);
    expect(isLaneEventVisible(tap, 4_161)).toBe(false);
  });

  it('renders hold duration as a rail proportional to its chart duration', () => {
    const projection = projectLaneEvent(hold, 2_800);
    expect(projection.startX).toBe(900);
    expect(projection.endX).toBeCloseTo(1_116.6667);
    expect(projection.railWidth).toBeCloseTo(216.6667);
  });

  it('derives position solely from song time so pause freezes it, and preserves each event section motif', () => {
    expect(projectLaneEvent(tap, 3_000)).toEqual(projectLaneEvent(tap, 3_000));
    expect(getNoteAssetKey('mail')).toBe(GAME_ASSETS.notes.mail.key);
    expect(getNoteAssetKey('arrival')).toBe(GAME_ASSETS.notes.arrival.key);
  });
});
