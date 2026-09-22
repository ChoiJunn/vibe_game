import 'server-only';

import type { Beatmap, RunState } from '@/domain/rhythm';
import type { ReplayInputEvent } from './verifiedReplay';
import { replayInputEvents } from './verifiedReplay';

export type ValidationReason =
  | 'unknown_run'
  | 'invalid_sequence'
  | 'impossible_timing'
  | 'score_mismatch'
  | 'state_mismatch';

export type ValidationResult = {
  valid: boolean;
  state: RunState;
  reason?: ValidationReason;
};

const STATE_FIELDS: readonly (keyof RunState)[] = [
  'runId', 'userOid', 'beatmapId', 'cursorMs', 'nextEventIndex', 'hearts', 'combo',
  'maxCombo', 'consecutivePerfects', 'score', 'perfectCount', 'goodCount', 'missCount',
];

export function validateRun(
  beatmap: Beatmap,
  initialState: RunState,
  events: ReplayInputEvent[],
  claimedState: RunState,
  terminalStatus: 'completed' | 'failed' | 'abandoned',
): ValidationResult {
  if (initialState.runId !== claimedState.runId || initialState.beatmapId !== beatmap.id || initialState.userOid !== claimedState.userOid) {
    return { valid: false, state: initialState, reason: 'unknown_run' };
  }
  const replay = replayInputEvents(beatmap, initialState, events, terminalStatus);
  if (replay.reason) return { valid: false, state: replay.state, reason: replay.reason };
  const scoreFields: readonly (keyof RunState)[] = ['score', 'perfectCount', 'goodCount', 'missCount'];
  if (scoreFields.some((field) => replay.state[field] !== claimedState[field])) {
    return { valid: false, state: replay.state, reason: 'score_mismatch' };
  }
  if (STATE_FIELDS.some((field) => replay.state[field] !== claimedState[field]) || replay.state.status !== terminalStatus) {
    return { valid: false, state: replay.state, reason: 'state_mismatch' };
  }
  if (terminalStatus === 'completed' && replay.state.nextEventIndex !== beatmap.events.length) {
    return { valid: false, state: replay.state, reason: 'state_mismatch' };
  }
  if (terminalStatus === 'failed' && replay.state.status !== 'failed') {
    return { valid: false, state: replay.state, reason: 'state_mismatch' };
  }
  return { valid: true, state: replay.state };
}
