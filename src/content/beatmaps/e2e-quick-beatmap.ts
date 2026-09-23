import type { Beatmap } from '@/domain/rhythm';

const e2eQuickBeatmap: Beatmap = {
  id: 'office-day-01',
  bpm: 155,
  timeSignature: [4, 4],
  sections: [
    { id: 'arrival', startMs: 0, endMs: 17455 },
    { id: 'keyboard', startMs: 17455, endMs: 34909 },
    { id: 'mail', startMs: 34909, endMs: 52364 },
    { id: 'meeting', startMs: 52364, endMs: 69818 },
    { id: 'copy', startMs: 69818, endMs: 87273 },
    { id: 'departure', startMs: 87273, endMs: 104727 },
  ],
  patterns: [
    { id: 'e2e-straight', kind: 'straight', label: '테스트 박자', startMs: 700, endMs: 2000, eventIds: ['e2e-tap-01', 'e2e-tap-02', 'e2e-tap-03'] },
    { id: 'e2e-hold', kind: 'hold', label: '테스트 홀드', startMs: 2600, endMs: 2800, eventIds: ['e2e-hold-01'] },
  ],
  events: [
    { id: 'e2e-tap-01', type: 'tap', startMs: 700, section: 'arrival', patternId: 'e2e-straight', patternKind: 'straight' },
    { id: 'e2e-tap-02', type: 'tap', startMs: 1400, section: 'arrival', patternId: 'e2e-straight', patternKind: 'straight' },
    { id: 'e2e-tap-03', type: 'tap', startMs: 2000, section: 'arrival', patternId: 'e2e-straight', patternKind: 'straight' },
    { id: 'e2e-hold-01', type: 'hold', startMs: 2600, endMs: 2800, section: 'arrival', patternId: 'e2e-hold', patternKind: 'hold' },
  ],
};

export default e2eQuickBeatmap;
