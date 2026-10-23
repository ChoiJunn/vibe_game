# Task: T01 Bind Practice Judgements to Notes

## Status: done

## Goal
When Pattern Codex practice resolves a tap, hold, or burst event, visibly flash the corresponding rendered note with the event's PERFECT, GOOD, or MISS grade. Make judged long holds and bursts visible at the judgement line even when their start has scrolled out of the normal note window. End the reaction after about 350 ms while preserving the existing textual judgement, timing error, lane flash, and Space key feedback.

## Decision Summary
- Use `snapshot.lastJudgement.eventId` to match the judgement to `chart.beatmap.events[].id`; `JudgementResult` already carries that ID for player hits and automatic misses.
- Animate the entire tap note, the hold bar and both endpoints, and every visible child note in a burst event. A burst is judged as one event, so all its subnotes share that event-level result.
- Use the existing grade palette in `globals.css`: PERFECT `#a8dfc6`, GOOD `#ffdd7a`, MISS `#ff8b7b`. Keep the animation near 350 ms and honor `prefers-reduced-motion` by suppressing scale movement while retaining a brief grade-color signal.

## Implementation

### I01. Connect the current judgement to the moving event visuals

- Related Files:
  - `src/components/practice/PracticeViewport.tsx` :: `PracticeViewport` — select and mark the event matching the latest judgement; modify

#### Details
- **Signatures & Types**:
  - Keep the component props unchanged. Relevant existing types are `PracticeChart`, `PracticeLoopResult`, `PracticeRunSnapshot`, and `JudgementResult`.
  - `PracticeRunSnapshot.lastJudgement?: JudgementResult`; `JudgementResult` has `judgement: "perfect" | "good" | "miss"`, `errorMs: number`, and `eventId: string`. Do not change controller or domain model types.
- **Execution Flow / Logic**:
  1. In the `chart.beatmap.events.map` callback, determine whether the event is the latest judged event by comparing `snapshot.lastJudgement?.eventId === event.id`.
  2. For a matching event, add a grade class to its note visual using the existing lowercase judgement value (for example `is-judged is-perfect`). Leave unmatched notes' class names and movement styles unchanged.
  3. Give the judged event visual a key that changes each time a judgement is recorded, including when the same event is judged again on a later loop. Use a judgement sequence derived from the monotonic session totals `sessionPerfectCount + sessionGoodCount + sessionMissCount`; do not add mutable component state or controller fields solely for this sequence.
  4. Apply the classes to the tap `<i>`, hold wrapper `<span>` and its two endpoint `<i>` elements, and each burst child `<i>`. A burst `eventId` represents the entire burst, so all of its visible child notes react to the event-level result.
  5. Preserve note visibility rules for ordinary approach notes. If the judged event's start is already outside the existing `-180 ms` trailing window (possible for a long hold or burst), keep that judged event visible at the judgement line (`left: 24%`) for its reaction and mark it as out-of-window; otherwise continue using the existing computed position. This makes a late judgement visible even when its event start occurred long before its end judgement.
  6. Do not alter `lastJudgement`, scoring, automatic miss timing, text feedback, beatmap event positions, or audio/input handling.

### I02. Add grade-specific note flash styles

- Related Files:
  - `src/app/globals.css` :: `.practice-moving-note` rules and practice reduced-motion media query — add note-level grade animations; modify

#### Details
- **CSS classes and behavior**:
  - Add styles adjacent to the existing `.practice-moving-note--tap`, `--hold`, and `--burst` rules. Reuse the `is-judged` plus one grade class from I01.
  - Use grade colors already present in `.practice-viewport__lane.is-*` and `.practice-live-feedback__judge.is-*`: PERFECT `#a8dfc6`, GOOD `#ffdd7a`, MISS `#ff8b7b`.
  - Animate only the judged event's visuals for `350ms` with an ease-out curve. For normally positioned notes, end at their base scale, color, and opacity so they return to their normal appearance. For the extra `is-out-of-window-judgement` class from I01, end at opacity `0` and keep that final state so a note temporarily held at the judgement line does not remain there after the flash. Ordinary notes continue to use the existing position and visibility rules.
  - Preserve each element's anchor transform in keyframes: tap centers with `translate(-50%, -50%)`; hold bar stays centered vertically with `translateY(-50%)`; hold endpoints center with `translate(-50%, -50%)`; burst child notes center and retain `rotate(35deg)`. Scale tap circles, hold bars/endpoints, and burst notes so all requested shapes visibly react.
  - Define a clear color pulse for each grade; use the grade color in the fill, border, or glow that best fits each shape, without changing its normal base style after animation ends.
  - Under `@media (prefers-reduced-motion: reduce)`, disable scale transforms but keep the grade-color flash and its 350 ms end/fade behavior. Preserve the current reduced-motion rules for lane, key, and beat indicators.

### I03. Assert tap judgement feedback in the browser practice scenario

- Related Files:
  - `e2e/pattern-codex.spec.ts` :: `practices the selected source pattern and returns to its variation list` — assert rendered note feedback after the existing Space input; modify

#### Details
- After the existing test presses Space and verifies input feedback, wait for the judged tap node `.practice-moving-note--tap.is-judged` to appear.
- Assert that the node carries one of the grade classes `is-perfect`, `is-good`, or `is-miss`, and that `getComputedStyle(node).animationName` is `practice-note-feedback-tap` and `animationDuration` is `0.35s`.
- Preserve all existing practice start, feedback, exit, and navigation assertions in this scenario.

## Acceptance Criteria
- [x] A judged tap circle visibly enlarges and flashes the color associated with PERFECT, GOOD, or MISS.
- [x] A judged hold flashes both the bar and both endpoints; a judged burst flashes each child note.
- [x] A judged long hold or burst remains visible near the judgement line long enough to show its grade feedback, even when its start time is outside the normal approach window.
- [x] The reaction lasts about 350 ms and can play again when the same event is judged in a later loop.
- [x] Reduced-motion preference suppresses enlargement but retains a brief, grade-specific color signal.
- [x] Existing lane/key feedback, judgement label, signed timing error, beat timing, scoring, and input behavior remain intact.

## Validation
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test -- --run src/game/practice/PracticeRunController.test.ts` — passed, 10 tests.
- `npx playwright test e2e/pattern-codex.spec.ts --project=chromium --grep "practices the selected source pattern"` — passed; the browser scenario confirms a Space input produces a grade-classed tap node with the 350 ms animation.
- Visual behavior for hold endpoints, burst children, late out-of-window judgements, and reduced-motion scaling is implemented but does not have a dedicated browser assertion yet.

## Commit Message
```text
feat(practice): flash judged pattern notes

Plan: 2026-10-23-pattern-practice-judgement-feedback
Phase: P01-note-judgement-feedback
Task: T01-bind-practice-judgements-to-notes

- Bind practice judgements to the matching tap, hold, and burst visuals
- Add grade-colored 350 ms feedback and reduced-motion behavior
- Assert rendered tap feedback in the browser practice scenario
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `feat(practice): flash judged pattern notes`

