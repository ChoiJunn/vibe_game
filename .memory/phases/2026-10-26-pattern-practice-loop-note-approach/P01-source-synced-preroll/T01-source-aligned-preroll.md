# Task: T01 Source-Aligned Practice Pre-Roll

## Status: done

## Goal
Change Pattern Codex practice charts so a loop's first note is placed at the source-audio time available before that event, capped at 1,500 ms. This makes the note visibly travel from the right on every loop restart without shifting it away from its corresponding music timing.

## Decision Summary
- Keep source event timestamps and the four-beat count-in unchanged. Start chart time at 0 after count-in and on each loop restart.
- Set the practice audio region start to `max(0, firstSourceEventMs - 1_500)`. Therefore Pattern 001 has a 968 ms lead-in; patterns with at least 1,500 ms of source audio before their first event have a 1,500 ms lead-in. The same selected pattern uses the same lead-in on every repetition.

## Implementation

### I01. Derive a source-aligned practice loop region

- Related Files:
  - `src/game/practice/createPracticeBeatmap.ts` :: `PracticeChart`, `createPracticeBeatmap` — calculate the source loop window and map source events into local practice time; modify.
  - `src/game/practice/createPracticeBeatmap.test.ts` :: `createPracticeBeatmap` tests — verify source timing, full and source-limited lead-in, and loop bounds; modify.

#### Details
- **Signatures & Types**:
  Preserve the existing public signatures and `PracticeChart` shape:
  ```typescript
  export type PracticeChart = {
    beatmap: Beatmap;
    patternId: string;
    sourceAudioStartMs: number;
    sourceAudioEndMs: number;
    loopDurationMs: number;
  };

  export function createPracticeBeatmap(beatmap: Beatmap, patternId: string): PracticeChart;
  ```
  Use a local constant `PRACTICE_APPROACH_WINDOW_MS = 1_500`; do not duplicate or change the viewport's existing 1,500 ms travel window.
- **Data & Schema Fields**:
  - Add no persisted fields and no public DTO fields.
  - `sourceAudioStartMs`: `number`, set to `Math.max(0, firstSourceEventMs - PRACTICE_APPROACH_WINDOW_MS)`.
  - `sourceAudioEndMs`: `number`, retain the existing final event end plus safe tail calculation.
  - `loopDurationMs`: `number`, retain `sourceAudioEndMs - sourceAudioStartMs`.
  - Each local event's `startMs` and optional `endMs` remain source timestamps minus `sourceAudioStartMs`. Preserve all other source event metadata and the stable generated practice IDs.
- **Execution Flow / Logic**:
  1. Precondition & Validation: retain the existing rejection for unknown or empty patterns; sort the selected pattern events by `startMs`, then `id` as currently done.
  2. Core Processing: get the earliest source event time; set `sourceAudioStartMs` to the greater of zero and that time minus 1,500 ms. Normalize every event against this start. The first local event must be `min(firstSourceEventMs, 1_500)` because source audio cannot begin before zero.
  3. Error & Exception Handling: do not use negative source positions, clamp audio region start below zero, or shift only the chart events to manufacture a longer lead-in. Those choices would either make the track loop invalid or desynchronize music and notes.
  4. State Transition & Return: preserve section/pattern end and loop duration calculations using the expanded source-audio region; return the same `PracticeChart` structure.

### I02. Verify start and loop-restart timing

- Related Files:
  - `src/game/practice/PracticeRunController.test.ts` :: `PracticeRunController` loop restart tests — verify the first local event remains ahead of the judgement position when the clock restarts at zero; modify.
  - `src/components/practice/PracticeViewport.tsx` :: event positioning in the snapshot render — read-only; confirm that a positive first-event timestamp renders to the right of the judgement line using its existing 1,500 ms approach window.
  - `src/game/practice/PracticeRunController.ts` :: `prepareAudio`, `beginPlaying`, `completeLoop`, `createSnapshot` — read-only unless a test reveals a violation; preserve count-in separation and zero-position loop restart.

#### Details
- Keep the controller's existing four-beat count-in and its `songPositionMs: 0` countdown snapshot. After the count-in, gameplay starts from local position 0; do not advance chart time during count-in because Pattern 001's first local event is at 968 ms and would otherwise be missed before input is enabled.
- Keep `completeLoop()` restarting the clock at 0 and `OfficeSoundScheduler.restartLoop()` scheduling from that position. The chart's positive first-event time is what creates the approach on each restart.
- Add or adjust controller tests so a chart with a positive first-event timestamp restarts at song position 0, ignores input before that timestamp according to existing judgement behavior, and can judge the first event at its source-aligned time after restart.
- Test `createPracticeBeatmap` with the real `office-day-01.json` data: Pattern 001 must have `sourceAudioStartMs === 0` and first local event `startMs === 968`; a pattern whose first event is at least 1,500 ms into its source must have first local event `startMs === 1_500`. For every event, `localStartMs + sourceAudioStartMs` must equal its source `startMs` (and the same invariant must hold for `endMs`).
- The existing `PracticeViewport` formula is `24 + (deltaMs / 1_500) * 70` percent. A positive first event timestamp must therefore place its note to the right of the judgement line at song position 0. Do not change note rendering, judgement windows, loop feedback, or the controls for this task.

## Acceptance Criteria
- [ ] Practice chart audio begins at most 1,500 ms before its first source event and never uses a negative source time.
- [ ] Pattern 001's first local event is 968 ms; a pattern with at least 1,500 ms of source lead has a first local event at 1,500 ms.
- [ ] Every normalized event preserves its source start/end timestamps after adding `sourceAudioStartMs`.
- [ ] On initial gameplay start and every loop restart, the first note is visibly to the right of the judgement line instead of appearing at the line.
- [ ] Initial count-in, input gating, audio synchronization, loop judgement, and loop completion behavior remain intact.

## Validation
- `pnpm test --run src/game/practice/createPracticeBeatmap.test.ts src/game/practice/PracticeRunController.test.ts` — targeted chart and practice controller tests pass.
- `pnpm typecheck` — TypeScript reports no errors.
- `pnpm lint` — ESLint reports no errors.

## Commit Message
```text
fix(practice): preserve first-note approach on loop restart

Plan: 2026-10-26-pattern-practice-loop-note-approach
Phase: P01-source-synced-preroll
Task: T01-source-aligned-preroll

- Include up to 1.5 seconds of source audio before practice pattern events
- Verify source timing and loop-restart note approach
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: created
