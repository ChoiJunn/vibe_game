# Task: T04 Add Touch Rhythm Input

## Status: complete

## Goal

Add a touch-only on-screen press control to both the main game and practice mode, backed by the existing shared timestamped input path. Desktop continues to use Space. Touch down/up must be judged like keyboard down/up so holds and burst repetition are possible and no button click bypasses timing.

## Decision Summary

- Follow D06: show the press control only when `(pointer: coarse)`/touch capability is present; retain desktop Space support.
- Route pointer down/up/cancel through `SpaceInputController` so persistence, terminal release, and the same game/practice judge receive consistent timestamped events.
- Ensure input source overlap (Space and touch) emits one down when the first source presses and one up only when the last source releases.

## Implementation

### I01. Source-aware shared input controller

- Related Files:
  - `src/game/input/SpaceInputController.ts` :: `SpaceInputControllerOptions`, key handlers, `releaseHeld`, `waitForRelease`; modify
  - `src/game/input/SpaceInputController.test.ts` :: source pairing, touch release, cancel, blur, duplicate-source and persisted sequence tests; modify
  - `src/game/RhythmGameController.ts` :: attached input interface; modify only to accept the minimal new press/release methods
  - `src/server/game/liveInputReplay.test.ts` :: ensure main-game pointer-style input still records replay-valid key pairs; modify if shared input semantics change

#### Details

- Add explicit source methods while preserving key listeners:
  ```typescript
  press(source: string): void;
  release(source: string): void;
  releaseHeld(): void;
  waitForRelease(): Promise<void>;
  ```
- Internally track active sources in a `Set<string>`. The transition from zero held sources to one emits exactly one timestamped `keydown`; adding another source emits none. Remove only the caller's source on release; transition back to zero emits exactly one `keyup` if that keydown was recorded while the game clock was playing.
- Space keyboard handlers delegate to `press('keyboard')`/`release('keyboard')`, continue to ignore key repeat and interactive-element key events, prevent browser scrolling, and retain current `onPauseRequest` blur behavior.
- Pointer source IDs include the active `pointerId`, so a second finger cannot prematurely release a hold. `pointercancel`, `lostpointercapture`, component unmount, pause, blur, and terminal freeze must release sources exactly once and settle `waitForRelease()`.
- Continue assigning one monotonic run sequence and persisting the same `keydown`/`keyup` VerifiedInputEvent records through the existing `onPersistInput` callback; pointer controls do not create a second persistence sequence.

### I02. Shared press button and game/practice integration

- Related Files:
  - `src/components/game/RhythmTouchButton.tsx` :: accessible pointer control; new
  - `src/components/game/PhaserCanvas.tsx` :: main-game touch control placement/active state; modify
  - `src/components/practice/PracticeViewport.tsx` :: practice touch control uses same `SpaceInputController`; modify
  - `src/app/globals.css` :: `.rhythm-touch-button` and practice responsive control layout; modify
  - `e2e/pattern-codex.spec.ts` :: touch-device test for main game and practice; modify

#### Details

- `RhythmTouchButton` props:
  ```typescript
  type RhythmTouchButtonProps = {
    input: Pick<SpaceInputController, 'press' | 'release'>;
    disabled?: boolean;
  };
  ```
- Use Pointer Events, pointer capture, `touch-action:none`, and a single active pointer ID. `onPointerDown` calls `press('touch:<pointerId>')`; `onPointerUp`, `onPointerCancel`, `onLostPointerCapture`, and cleanup release the same source idempotently. Do not use `onClick` to submit a judgement.
- Give the control a Korean accessible name (`리듬 입력 길게 누르기`), visible pressed state, large touch target (minimum 64 CSS px), focus indication, and no overlap with pause/exit or browser navigation controls.
- Detect coarse-pointer capability with a component hook based on `matchMedia('(pointer: coarse)')` and subscribe to media changes; render only in active gameplay/practice, not menus, result screens, or pause overlays. Do not rely only on viewport width, because a narrow desktop can still use a keyboard.
- In the main game, use the same `SpaceInputController` instance already attached to `RhythmGameController`, so autosave, terminal keyup, and server replay sequence remain intact. In practice, use the `PracticeRunController`'s input instance.
- The touch button supports taps by down/up, holds by continuous pointer-down until release, and bursts by repeated down/up cycles. Repeated pointerdown while held must not duplicate a down.

### I03. Input-control regression tests

- Unit tests must assert source overlap, duplicate down, pointer cancel, lost capture, pause/terminal release, and exactly one down/up persisted pair per complete press.
- Mobile Chromium E2E must verify the button is visible on coarse-pointer input and absent on a fine-pointer desktop; a timed tap changes live judgement; holding across a hold note and repeated taps across a burst produce the same controller results as keyboard input.
- Main-game E2E must prove touch input is routed through gameplay/autosave rather than granting a direct UI judgement; keep the existing verified-result submission tests green.

## Acceptance Criteria

- [ ] Touch-capable devices show a usable on-screen press control in both main and practice gameplay; non-touch desktop uses Space without the control.
- [ ] Press and release timestamps use the active song clock and the same judge path as keyboard input.
- [ ] Tap, hold, burst, multitouch overlap, cancel, pause, and terminal release cannot leave a stuck key or synthesize extra events.
- [ ] Main-game autosave event sequences remain contiguous and valid for server replay.

## Validation

- `npm run test -- --run src/game/input/SpaceInputController.test.ts src/server/game/liveInputReplay.test.ts`
- `npx playwright test e2e/pattern-codex.spec.ts --project=chromium`
- `npm run typecheck`
- `npx eslint src/game/input src/components/game/RhythmTouchButton.tsx src/components/game/PhaserCanvas.tsx src/components/practice/PracticeViewport.tsx e2e/pattern-codex.spec.ts`

## Commit Message

```text
feat(game): add touch rhythm input to gameplay and practice

Plan: 2026-09-28-pattern-codex-practice
Phase: P01-pattern-codex-practice
Task: T04-add-touch-rhythm-input

- Share timestamped press/release input across keyboard and touch
- Add a touch-only control to the main game and practice lane
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 76b2892
