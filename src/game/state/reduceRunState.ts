import type { RunState } from '@/domain/rhythm';
import type { JudgementResult } from '@/game/judgement/types';
import { calculateJudgementScore } from './scorePolicy';

export type RunStateAction = {
  result: JudgementResult;
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
    status: 'active',
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
    updatedAt: new Date(0).toISOString(),
  };
}

export function reduceRunState(state: RunState, action: RunStateAction): RunState {
  if (state.status !== 'active' || action.eventIndex !== state.nextEventIndex) {
    return state;
  }

  const result = action.result;
  const combo = result.judgement === 'miss' ? 0 : state.combo + 1;
  const consecutivePerfects = result.judgement === 'perfect' ? state.consecutivePerfects + 1 : 0;
  const heartReward = result.judgement === 'perfect' && consecutivePerfects % 10 === 0 ? 1 : 0;
  const hearts = Math.min(5, state.hearts + heartReward - (result.judgement === 'miss' ? 1 : 0));
  const status = hearts <= 0 ? 'failed' : shouldComplete(action) ? 'completed' : 'active';

  return {
    ...state,
    status,
    cursorMs: action.songPositionMs,
    nextEventIndex: state.nextEventIndex + 1,
    hearts,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    consecutivePerfects,
    score: state.score + calculateJudgementScore(result, combo),
    perfectCount: state.perfectCount + (result.judgement === 'perfect' ? 1 : 0),
    goodCount: state.goodCount + (result.judgement === 'good' ? 1 : 0),
    missCount: state.missCount + (result.judgement === 'miss' ? 1 : 0),
    updatedAt: new Date(0).toISOString(),
  };
}

function shouldComplete(action: RunStateAction): boolean {
  return action.isFinalEvent === true && action.songPositionMs >= (action.finalEventEndMs ?? action.songPositionMs);
}
