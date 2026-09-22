import type { Beatmap } from '@/domain/rhythm';

const e2eQuickBeatmap: Beatmap = {
  id: 'office-day-01',
  bpm: 110,
  timeSignature: [4, 4],
  sections: [
    { id: 'arrival', startMs: 0, endMs: 17455 },
    { id: 'keyboard', startMs: 17455, endMs: 34909 },
    { id: 'mail', startMs: 34909, endMs: 52364 },
    { id: 'meeting', startMs: 52364, endMs: 69818 },
    { id: 'copy', startMs: 69818, endMs: 87273 },
    { id: 'departure', startMs: 87273, endMs: 104727 },
  ],
  events: [
    { id: 'e2e-tap-01', type: 'tap', startMs: 700, section: 'arrival' },
    { id: 'e2e-tap-02', type: 'tap', startMs: 1400, section: 'arrival' },
    { id: 'e2e-tap-03', type: 'tap', startMs: 2000, section: 'arrival' },
    { id: 'e2e-hold-01', type: 'hold', startMs: 2600, endMs: 2800, section: 'arrival' },
  ],
};

export default e2eQuickBeatmap;
