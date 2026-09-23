import type { JudgementResult } from "@/game/judgement/types";

export const BASE_SCORES = {
  perfect: 100,
  good: 60,
  miss: 0,
} as const;

export function getComboMultiplier(combo: number): number {
  const safeCombo = Math.max(0, Math.floor(combo));
  return Math.min(1.5, 1 + Math.floor(safeCombo / 10) * 0.1);
}

export type ScoreBonusContext = {
  riskBonus?: boolean;
  feverActive?: boolean;
};

export function calculateJudgementScore(
  result: JudgementResult,
  comboAfterJudgement: number,
  bonuses: ScoreBonusContext = {},
): number {
  const baseScore = BASE_SCORES[result.judgement] * getComboMultiplier(comboAfterJudgement);
  const riskMultiplier = bonuses.riskBonus ? 2 : 1;
  const feverBonus = bonuses.feverActive ? baseScore * 0.25 : 0;
  return Math.round(baseScore * riskMultiplier + feverBonus);
}
