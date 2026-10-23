# Task: T03 Show Practice Space Input

## Status: done

## Goal

Show immediate, unmistakable feedback whenever the practice controller receives a physical Space key press, even when the press is off-beat, while preserving existing note judgement, score, and hold/burst semantics.

## Decision Summary

- `PracticeViewport` currently displays only the last note judgement and timing error; `PracticeRunController.handleInput` is the authoritative point where keyboard/touch input reaches practice.
- Input-received feedback is separate from `PERFECT`/`GOOD`/`MISS`; an off-beat press must still report its actual judgement and must not be promoted to a hit.

## Implementation

### I01. Carry sequenced physical input feedback through the practice snapshot

- Related Files:
  - `src/game/practice/PracticeRunController.ts` :: `PracticeRunSnapshot`, `PracticeRunController.handleInput`, `createSnapshot` — publish the most recent accepted keydown/keyup with a monotonically increasing sequence; modify
  - `src/game/practice/PracticeRunController.test.ts` :: `PracticeRunController` input-feedback coverage — verify key events publish independently of judgement; modify

#### Details

- Add exported readonly type:
  ```typescript
  export type PracticeInputFeedback = Readonly<{
    sequence: number;
    type: "keydown" | "keyup";
    songPositionMs: number;
  }>;
  ```
- Add optional `inputFeedback?: PracticeInputFeedback` to `PracticeRunSnapshot`; initialize no feedback before the first playing input.
- Add a private monotonic sequence counter and current feedback field to `PracticeRunController`. Do not reset the sequence between loops; do not persist it to localStorage or the server.
- In `handleInput`, after confirming `status === "playing"` and `!loopRestarting`, record the received input and emit a snapshot before applying judgement logic. Preserve current handling of tap keyup suppression, holds, bursts, and arbitrary presses.
- Do not publish keys received while paused, counting down, summary/exited, or during loop restart; the controller already ignores these states.
- Keep `lastJudgement` and run-state counts updated only by existing judgement paths.

#### Test cases

- A keydown increments `inputFeedback.sequence` and records type and song position before any corresponding keyup.
- An early/off-beat keydown still increments the feedback sequence while the existing expected event remains a `MISS` according to current judgement rules.
- Paused/countdown input does not change `inputFeedback`.
- A tap's suppressed keyup remains suppressed for judgement but still clears/updates physical-input feedback.

### I02. Render immediate key confirmation and keep judgement visible

- Related Files:
  - `src/components/practice/PracticeViewport.tsx` :: `PracticeViewport` — render a pulsing Space key indicator keyed by input sequence; modify
  - `src/app/globals.css` :: `.practice-space-feedback`, `.practice-space-feedback__key`, `.practice-viewport__lane` input-active modifier — add high-contrast flash animation and reduced-motion fallback; modify
  - `e2e/pattern-codex.spec.ts` :: practice input feedback scenario — assert physical Space press is acknowledged; modify

#### Details

- Render a visible `<kbd>SPACE</kbd>` indicator and concise text for “입력 감지” near the practice lane. Before any press, show a neutral prompt.
- On every new `inputFeedback.sequence`, add a brief high-contrast lane/key pulse using a keyed element or a CSS custom property so consecutive presses restart the pulse reliably.
- When feedback type is `keydown`, use a pressed style for the immediate press pulse; keyup returns the badge to idle without clearing the latest judgement.
- Keep the existing live region that shows judgement and signed timing error. Do not let key feedback replace that text.
- Add `aria-live="polite"` to a concise input-confirmation region, and do not announce raw song timestamps or a long message per animation frame.
- Under `prefers-reduced-motion: reduce`, remove transform/flash animation but retain a static border/fill state and text confirmation.
- In E2E, after entering active pattern practice, read the indicator's `data-input-sequence`, send `page.keyboard.press('Space')`, wait for the sequence to increase, and assert the input-confirmation label is visible. Do not require a particular judgement because the browser test timing is not deterministic.

## Acceptance Criteria

- [x] Every received Space press produces an immediate visible, accessible confirmation in practice.
- [x] The judgement and signed millisecond error remain independently visible after the input pulse.
- [x] Off-beat input is visibly received but keeps its correct `MISS`/`GOOD`/`PERFECT` result.
- [x] Reduced-motion mode still confirms input without relying on animation.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm test -- src/game/practice/PracticeRunController.test.ts --run` — controller input and judgement behavior passes.
- `npm run test:e2e -- --project=chromium e2e/pattern-codex.spec.ts` — Space feedback scenario passes.

## Commit Message

```text
feat(practice): show received space input immediately

Plan: 2026-10-22-rhythm-game-visual-input-timing-fix
Phase: P01-visual-input-timing
Task: T03-show-practice-space-input

- Publish sequenced input feedback without changing judgement
- Add visible and accessible Space press confirmation
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- Validation: typecheck, lint, controller unit tests (7 passed), and pattern-codex E2E suite (11 passed).
- commit: pending

