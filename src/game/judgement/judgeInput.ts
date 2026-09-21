import type { JudgementEvent, HoldJudgementResult, InputEvent, JudgementResult } from './types';
import { JUDGEMENT_WINDOWS } from './types';

export function judgeTap(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.startMs, 'keydown', event.type === 'tap', input, inputOffsetMs);
}

export function judgeHoldStart(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.startMs, 'keydown', event.type === 'hold', input, inputOffsetMs);
}

export function judgeHoldEnd(event: JudgementEvent, input: InputEvent, inputOffsetMs = 0): JudgementResult {
  return judgePoint(event.id, event.endMs ?? event.startMs, 'keyup', event.type === 'hold', input, inputOffsetMs);
}

export function combineHoldJudgements(start: JudgementResult, end: JudgementResult): HoldJudgementResult {
  const combinedJudgement = worstJudgement(start.judgement, end.judgement);
  const errorMs = Math.abs(start.errorMs) >= Math.abs(end.errorMs) ? start.errorMs : end.errorMs;

  return {
    start,
    end,
    combined: {
      judgement: combinedJudgement,
      errorMs,
      eventId: start.eventId,
    },
  };
}

function judgePoint(
  eventId: string,
  targetMs: number,
  expectedInputType: InputEvent['type'],
  eventTypeMatches: boolean,
  input: InputEvent,
  inputOffsetMs: number,
): JudgementResult {
  const errorMs = input.songPositionMs + inputOffsetMs - targetMs;
  const absoluteErrorMs = Math.abs(errorMs);

  if (!eventTypeMatches || input.type !== expectedInputType) {
    return { judgement: 'miss', errorMs, eventId };
  }

  if (absoluteErrorMs <= JUDGEMENT_WINDOWS.perfectMs) {
    return { judgement: 'perfect', errorMs, eventId };
  }

  if (absoluteErrorMs <= JUDGEMENT_WINDOWS.goodMs) {
    return { judgement: 'good', errorMs, eventId };
  }

  return { judgement: 'miss', errorMs, eventId };
}

function worstJudgement(left: JudgementResult['judgement'], right: JudgementResult['judgement']): JudgementResult['judgement'] {
  const rank = { perfect: 0, good: 1, miss: 2 } as const;
  return rank[left] >= rank[right] ? left : right;
}
