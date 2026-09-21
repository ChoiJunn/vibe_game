import type { JudgementResult } from '@/game/judgement/types';

export const BASE_SCORES = {
  perfect: 100,
  good: 60,
  miss: 0,
} as const;

export function getComboMultiplier(combo: number): number {
  const safeCombo = Math.max(0, Math.floor(combo));
  return Math.min(1.5, 1 + Math.floor(safeCombo / 10) * 0.1);
}

export function calculateJudgementScore(result: JudgementResult, comboAfterJudgement: number): number {
  return Math.round(BASE_SCORES[result.judgement] * getComboMultiplier(comboAfterJudgement));
}
