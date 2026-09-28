import type { RhythmEvent, RunState } from "@/domain/rhythm";
import type { JudgementResult } from "@/game/judgement/types";
import { calculateJudgementScore } from "./scorePolicy";

export type RunStateAction = {
  result: JudgementResult;
  event: RhythmEvent;
  eventIndex: number;
  isFinalEvent?: boolean;
  finalEventEndMs?: number;
  songPositionMs: number;
};

export function createInitialRunState(input: {
  runId: string;
  userOid: string;
  beatmapId: string;
  hearts?: number;
}): RunState {
  return {
    runId: input.runId,
    userOid: input.userOid,
    beatmapId: input.beatmapId,
    status: "active",
    cursorMs: 0,
    nextEventIndex: 0,
    hearts: Math.min(5, Math.max(0, input.hearts ?? 5)),
    combo: 0,
    maxCombo: 0,
    consecutivePerfects: 0,
    score: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    riskBonusRemaining: 0,
    feverGauge: 0,
    feverActiveUntilMs: 0,
    riskSuccessCount: 0,
    riskFailureCount: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeRunState(state: RunState): RunState {
  return {
    ...state,
    riskBonusRemaining: Math.max(0, Math.min(4, state.riskBonusRemaining ?? 0)),
    feverGauge: Math.max(0, Math.min(100, state.feverGauge ?? 0)),
    feverActiveUntilMs: Math.max(0, state.feverActiveUntilMs ?? 0),
    riskSuccessCount: Math.max(0, state.riskSuccessCount ?? 0),
    riskFailureCount: Math.max(0, state.riskFailureCount ?? 0),
  };
}

export function reduceRunState(
  state: RunState,
  action: RunStateAction,
  options: { continueAfterZeroHearts?: boolean } = {},
): RunState {
  if (state.status !== "active" || action.eventIndex !== state.nextEventIndex) {
    return state;
  }

  const normalizedState = normalizeRunState(state);
  const result = action.result;
  const combo = result.judgement === "miss" ? 0 : normalizedState.combo + 1;
  const consecutivePerfects =
    result.judgement === "perfect" ? normalizedState.consecutivePerfects + 1 : 0;
  const heartReward =
    result.judgement === "perfect" && consecutivePerfects % 10 === 0 ? 1 : 0;
  const hearts = Math.max(0, Math.min(
    5,
    normalizedState.hearts + heartReward - (result.judgement === "miss" ? 1 : 0),
  ));
  const status =
    hearts <= 0 && !options.continueAfterZeroHearts ? "failed" : shouldComplete(action) ? "completed" : "active";
  const riskBonusActive = normalizedState.riskBonusRemaining > 0;
  const successfulBurst = action.event.type === "burst" && result.judgement !== "miss";
  const riskBonusRemaining = successfulBurst
    ? 4
    : Math.max(0, normalizedState.riskBonusRemaining - (riskBonusActive ? 1 : 0));
  const feverActive = action.songPositionMs < normalizedState.feverActiveUntilMs;
  const feverGain = result.judgement === "perfect" ? 10 : result.judgement === "good" ? 5 : 0;
  let feverGauge = Math.min(100, normalizedState.feverGauge + feverGain);
  let feverActiveUntilMs = feverActive ? normalizedState.feverActiveUntilMs : 0;
  if (feverGauge >= 100) {
    feverGauge = 0;
    feverActiveUntilMs = action.songPositionMs + 8000;
  }

  return {
    ...normalizedState,
    status,
    cursorMs: action.songPositionMs,
    nextEventIndex: normalizedState.nextEventIndex + 1,
    hearts,
    combo,
    maxCombo: Math.max(normalizedState.maxCombo, combo),
    consecutivePerfects,
    score: normalizedState.score + calculateJudgementScore(result, combo, { riskBonus: riskBonusActive, feverActive }),
    perfectCount: normalizedState.perfectCount + (result.judgement === "perfect" ? 1 : 0),
    goodCount: normalizedState.goodCount + (result.judgement === "good" ? 1 : 0),
    missCount: normalizedState.missCount + (result.judgement === "miss" ? 1 : 0),
    riskBonusRemaining,
    feverGauge,
    feverActiveUntilMs,
    riskSuccessCount: normalizedState.riskSuccessCount + (successfulBurst ? 1 : 0),
    riskFailureCount: normalizedState.riskFailureCount + (action.event.type === "burst" && result.judgement === "miss" ? 1 : 0),
    updatedAt: new Date(0).toISOString(),
  };
}

function shouldComplete(action: RunStateAction): boolean {
  return (
    action.isFinalEvent === true &&
    action.songPositionMs >= (action.finalEventEndMs ?? action.songPositionMs)
  );
}
