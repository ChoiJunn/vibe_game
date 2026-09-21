import type { Judgement } from './rhythm';

export type ScoreBreakdown = {
  judgement: Judgement;
  basePoints: number;
  multiplier: number;
  awardedPoints: number;
};

export type ScoreResult = {
  score: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  durationMs: number;
  status: 'completed' | 'failed' | 'abandoned';
  breakdown: ScoreBreakdown[];
};

export function createEmptyScoreResult(): ScoreResult {
  return {
    score: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    maxCombo: 0,
    durationMs: 0,
    status: 'abandoned',
    breakdown: [],
  };
}
