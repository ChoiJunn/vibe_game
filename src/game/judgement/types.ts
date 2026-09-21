import type { RhythmEvent } from '@/domain/rhythm';

export const JUDGEMENT_WINDOWS = {
  perfectMs: 80,
  goodMs: 160,
} as const;

export type InputEvent = {
  type: 'keydown' | 'keyup';
  songPositionMs: number;
};

export type JudgementResult = {
  judgement: 'perfect' | 'good' | 'miss';
  errorMs: number;
  eventId: string;
};

export type HoldJudgementResult = {
  start: JudgementResult;
  end: JudgementResult;
  combined: JudgementResult;
};

export type JudgementEvent = Pick<RhythmEvent, 'id' | 'type' | 'startMs' | 'endMs'>;
