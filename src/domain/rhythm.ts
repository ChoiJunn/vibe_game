export type NoteType = 'tap' | 'hold';
export type Judgement = 'perfect' | 'good' | 'miss';

export type SectionId = 'arrival' | 'keyboard' | 'mail' | 'meeting' | 'copy' | 'departure';

export type RhythmEvent = {
  id: string;
  type: NoteType;
  startMs: number;
  endMs?: number;
  section: SectionId;
};

export type Beatmap = {
  id: 'office-day-01';
  bpm: 110;
  timeSignature: [4, 4];
  events: RhythmEvent[];
  sections: Array<{ id: SectionId; startMs: number; endMs: number }>;
};

export type RunState = {
  runId: string;
  userOid: string;
  beatmapId: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'abandoned';
  cursorMs: number;
  nextEventIndex: number;
  hearts: number;
  combo: number;
  maxCombo: number;
  consecutivePerfects: number;
  score: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  updatedAt: string;
};

export const SECTION_ORDER: readonly SectionId[] = [
  'arrival',
  'keyboard',
  'mail',
  'meeting',
  'copy',
  'departure',
];
