# Task: T03 Implement Timed Looping Practice

## Status: pending

## Goal

Replace the timing-free `PracticeRunController` with a real-time, endlessly looping practice session for one selected source variation. It must use the main game's 80 ms PERFECT / 160 ms GOOD windows, real tap/hold/burst down-up semantics, automatic MISS deadlines, and the matching segment of `office-groove.wav`. MISS never ends a practice session; the user exits explicitly.

## Decision Summary

- Follow D01/D04/D05/D07/D09: use shared game judgement semantics, play the selected original music segment, perform one short four-beat count-in at the beginning, then continue loops without a result dialog or per-loop count-in.
- Practice displays a moving-note lane and judgement line, but no main-game character, hearts, or game-over overlay.
- The main game must retain its existing fail-on-zero-hearts behavior; a continue-after-zero policy is explicit practice-only and defaults to normal game rules.

## Implementation

### I01. Preserve source timing/audio region when creating a practice chart

- Related Files:
  - `src/game/practice/createPracticeBeatmap.ts` :: `createPracticeBeatmap`; modify
  - `src/game/practice/createPracticeBeatmap.test.ts` :: source IDs, relative event times, audio-region mapping, hold/burst boundaries; new
  - `src/content/beatmaps/patternLibrary.ts` :: `PatternSummary.events`, source pattern times; read-only
  - `src/domain/rhythm.ts` :: `Beatmap`, `RhythmEvent`; read-only

#### Details

- Return an explicit practice selection instead of losing source audio offsets:
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
- Keep unique practice event IDs and preserve each source event's type, `patternKind`, `requiredPresses`, section, pattern ID, relative start/end timing, and event order. `sourceAudioStartMs` is the source phrase's original first event time; `sourceAudioEndMs` reaches the last event's authored `endMs ?? startMs` plus a safe tail so the last judgement resolves before the loop boundary.
- Reject unknown IDs and variations with no events; do not silently fall back to another variation.
- Keep beatmap BPM and time signature unchanged. Add a one-beat loop tail where needed so the final note's GOOD deadline resolves before resetting the phrase.

### I02. Real timing, input, no-fail policy, and loop lifecycle

- Related Files:
  - `src/game/practice/PracticeRunController.ts` :: `PracticeRunController`, `PracticeRunSnapshot`, `calculateAccuracy`; replace timing-free implementation
  - `src/game/practice/PracticeRunController.test.ts` :: deterministic real-time hit/miss/loop/pause tests; modify
  - `src/game/RhythmGameController.ts` :: `RhythmGameControllerOptions`, `applyResult`, `update`; add an explicit practice no-fail option or a narrow reusable mode boundary
  - `src/game/state/reduceRunState.ts` :: `RunStateAction`, `reduceRunState`; make zero-heart behavior configurable while preserving current default
  - `src/game/judgement/judgeInput.ts` and `src/game/judgement/types.ts` :: shared judge functions and `JUDGEMENT_WINDOWS`; read-only/reuse
  - `src/game/RhythmGameController.test.ts` and `src/game/state/reduceRunState.test.ts` :: gameplay-default failure regression and practice no-fail case; modify

#### Details

- Do not expose `registerJudgement('perfect')` as a gameplay API. Practice input must enter as timestamped `{type:'keydown'|'keyup', songPositionMs}` events and reach the same judge functions used by `RhythmGameController`.
- Practice run snapshot must include: selected `patternId`; `status: 'countdown'|'playing'|'paused'|'summary'|'exited'`; current variation event index; current-loop perfect/good/miss counts and accuracy; most-recent judgement/error; completed loop count; cumulative session perfect/good/miss counts; best completed-loop accuracy; and source/audio timeline position.
- Provide controller methods `start()`, `pause()`, `resume()`, `exit()`, `subscribe(listener)`, and `getSnapshot()`. A test clock/frame scheduler may be injected; production advances the controller from `requestAnimationFrame` and calls game-controller `update()` so automatic misses happen without user input.
- Reuse `RhythmGameController` judge semantics. Add an explicit `continueAfterZeroHearts?: boolean`/equivalent mode option whose default remains `false`; when enabled only for practice, heart depletion must not set `status:'failed'`, and hearts must remain clamped at zero. Add a test proving default game mode still fails at zero hearts.
- A tap is judged on keydown; the corresponding release must not advance or score a second event. A hold combines start keydown and end keyup judgements. A burst requires the authored number of properly paired keydown/keyup presses within the source window. Wrong, early/late, unpaired, and missed input must use the shared judgement rules, never synthetic PERFECT.
- At each note's GOOD deadline, call the same automatic-miss progression for an unhit tap/hold/burst. A MISS increments the current loop and session miss totals, but does not decrement a practice life or stop the loop.
- Start with a four-quarter-beat visible/audio count-in once. At a completed loop, emit one immutable `PracticeLoopResult` callback, add it to session totals, and immediately begin the next loop without a blocking summary or count-in. Do not count an incomplete loop when `exit()` is called.
- Add a music-region/loop API to `OfficeSoundScheduler`/`MusicTrackPlayer` (or a dedicated practice scheduler) that seeks to `sourceAudioStartMs`, loops only through `sourceAudioEndMs`, pauses/resumes at the matching phase, and does not fetch/decode the WAV on every lap. Whole-game scheduling remains unchanged when no region is supplied.
- `PracticeRunController` owns/disposes clock, scheduler, input, animation frame, and audio nodes; pause freezes chart and music at one phase; resume preserves phase; exit releases held input and stops every timer/source.

### I03. Practice lane and live feedback

- Related Files:
  - `src/components/practice/PracticeViewport.tsx` :: practice lane, controls, session lifecycle; modify
  - `src/app/globals.css` :: `.practice-viewport*`, `.practice-note*`; modify
  - `src/components/practice/PracticeViewport.test.tsx` :: if existing test tooling can render client components; otherwise cover via T05 E2E; new only if supported without adding a test dependency

#### Details

- Render moving notes against a fixed judgement line using `songPositionMs` and event start/end times, not a progress-only cursor. Visually differentiate tap, hold duration, and each burst press; show the selected Korean variation title.
- Show count-in, current `PERFECT`/`GOOD`/`MISS`, current loop accuracy and P/G/M counts, completed loops, and pause/resume/exit actions. No hearts, game-over overlay, or per-loop modal.
- Keep existing settings-independent muted/unavailable-audio behavior recoverable; a failed music fetch must still allow timing practice and announce that backing audio is unavailable.
- On user exit, stop the engine and expose a session summary view through the same practice route: completed loops, best accuracy, and cumulative P/G/M. If zero loops completed, explicitly show no completed attempts. Provide a button back to the selected variation list.

## Acceptance Criteria

- [ ] Correct/incorrect input is determined by song-clock offset and existing judgement rules; arbitrary Space presses do not automatically score PERFECT.
- [ ] Tap, hold, burst, and automatic-miss paths all advance correctly; misses do not end practice.
- [ ] Selected original music region and chart loop remain phase-aligned across repeated loops; the backing WAV is not re-fetched/re-decoded for every loop.
- [ ] No per-loop popup or stop occurs; completed-loop callback and session totals advance once per completed phrase.
- [ ] Pause/resume/exit releases held input and leaves no active timer or audio source.
- [ ] Existing main-game heart failure, score results, and audio scheduling tests continue to pass.

## Validation

- `npm run test -- --run src/game/practice/createPracticeBeatmap.test.ts src/game/practice/PracticeRunController.test.ts src/game/judgement/judgeInput.test.ts src/game/RhythmGameController.test.ts src/game/state/reduceRunState.test.ts src/game/audio/OfficeSoundScheduler.test.ts`
- `npm run typecheck`
- `npx eslint src/game/practice src/game/RhythmGameController.ts src/game/state/reduceRunState.ts src/game/audio/OfficeSoundScheduler.ts src/game/audio/MusicTrackPlayer.ts`

## Commit Message

```text
feat(practice): add timed looping rhythm practice

Plan: 2026-09-28-pattern-codex-practice
Phase: P01-pattern-codex-practice
Task: T03-implement-timed-loop-practice

- Judge practice input with the main game's timing rules
- Loop the selected backing track and phrase until the user exits
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (47 unit tests, typecheck, ESLint, 5 Chromium catalog/practice E2E tests)
- commit: `feat(practice): add timed looping rhythm practice`
