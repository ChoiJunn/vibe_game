# Task: T02 Game Start Countdown

## Status: done

## Goal
Before either a new run or a continued saved run begins, show `3`, `2`, `1` at one-second intervals, then a brief `GO` cue. Play a short beat sound for each cue when SFX is enabled. Keep the gameplay clock and keyboard input inactive until the count-in completes.

## Decision Summary
- Use a fixed one-second interval, not beatmap BPM timing.
- Apply the count-in to new and continued runs selected from the saved-session dialog and to immediate starts with no saved session.
- Do not apply this count-in to resuming an already-started paused game through `PauseCoordinator`.
- Respect `AudioSettings.muted` and `AudioSettings.sfxVolume`; a sound setup failure must not skip the visible count-in.
- Reuse `OfficeSoundScheduler.playCountInBeat`; do not change the practice screen's existing four-beat BPM-based count-in.

## Implementation

### I01. Add a cancellable start count-in to the gameplay controller
- Related Files:
  - `src/game/RhythmGameController.ts` :: `RhythmGameController.start`, controller lifecycle; modify
  - `src/game/audio/types.ts` :: `AudioClock` contract; modify
  - `src/game/audio/AudioClock.ts` :: `AudioClock`; add count-in audio-context preparation method
  - `src/game/audio/OfficeSoundScheduler.ts` :: existing `playCountInBeat`; read-only unless a type adjustment is required
  - `src/game/RhythmGameController.test.ts` :: start lifecycle/count-in tests; modify

#### Details
- Export `GameStartCountdownStep = 3 | 2 | 1 | 'GO'` from `RhythmGameController.ts`.
- Extend `RhythmGameController.start` with an optional final callback `(step: GameStartCountdownStep | null) => void`; existing callers such as `PauseCoordinator` omit the callback and retain current resume behavior.
- Keep the existing state reset, `clock.load`, and `scheduler.load` before count-in. Before the first audible count, ask the clock to resume its `AudioContext` without starting the song-position clock; catch preparation failure so visual count-in continues, while normal `clock.start` error handling remains authoritative after GO.
- For each of `3`, `2`, and `1`, invoke the callback, call `scheduler.playCountInBeat` (accent the first number), and await exactly 1,000 ms. Then invoke `GO`, play the accented sound, and hold the GO state for 250 ms before starting the song clock.
- Only after count-in, call `clock.start(atSongMs)`, `scheduler.start()`, and `inputController.start()`, then clear the callback with `null` and emit the normal snapshot. `handleInput` must continue rejecting inputs before the clock is `playing`.
- Add `AudioClock.prepareForCountIn(): Promise<void>` to the `AudioClock` contract and implementation; it resumes the existing context but does not set the song anchor or change clock state. Do not call it for muted/zero-SFX count-in.
- Add a start-generation/cancellation guard so `stop`/`dispose` during an awaited count-in cannot start audio or input after the controller has been disposed. Clear pending timeout work on stop and resolve the start as cancelled without an error state.
- Unit coverage must verify cue order/timing, that clock/scheduler/input start only after GO, that muted/zero-volume settings suppress cue audio, and that cancellation prevents a delayed start.

### I02. Display the count-in over the stage
- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `GameStartCountdownStep`, `startGame`, and game-stage render; modify
  - `src/app/globals.css` :: add `.game-start-countdown` styles and reduced-motion handling; modify

#### Details
- Add React state `countdown: GameStartCountdownStep | null`, initially `null`.
- Pass a callback to `controller.start` from the session-start path to update this state. Keep the existing pause/resume call path callback-free so pause recovery does not add a start count-in.
- While a cue is active, render an overlay centered over `.game-play-surface`, with the current large `3`, `2`, `1`, or `GO`, `role="status"`, and `aria-live="assertive"`; keep number text visible without relying on animation.
- Use the existing stage color palette and a subtle opacity/scale transition. Disable or reduce transitions under `prefers-reduced-motion: reduce`.
- Clear countdown state after the controller signals `null`, on load failure, and on component unmount.

### I03. Cover new and continued game starts
- Related Files:
  - `e2e/game-entry.spec.ts` :: immediate start and saved-session choices; modify
  - `e2e/gameplay.spec.ts` :: gameplay readiness expectations after entry; modify only if existing assertions assume immediate clock start

#### Details
- Verify an empty-session `/game?start=1` flow displays `3`, `2`, `1`, `GO`, then exposes the live pause control.
- Verify selecting `이어하기` on an existing saved session shows the same count-in and resumes at its saved position without creating another session.
- Verify selecting `새 게임` shows the same count-in after the old run is explicitly closed and the replacement session is created.
- Verify gameplay input/state does not advance during the count-in and the countdown does not restart on a pause/resume action.
- Keep tests deterministic with fake timers at the controller layer; E2E may use reduced motion and wait for the final live-game control.

## Acceptance Criteria
- [x] New and continued runs show `3`, `2`, `1` at one-second intervals and then `GO`.
- [x] Gameplay clock, score, and input begin only after the GO cue.
- [x] Count-in sounds follow stored SFX mute and volume settings.
- [x] A failed sound preparation does not suppress the visual count-in; gameplay startup reports its existing audio error if the clock itself cannot start.
- [x] Pause/resume does not replay the start count-in.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm test -- --run src/game/RhythmGameController.test.ts src/game/audio/AudioClock.test.ts`
- `npm run test:e2e -- --project=chromium --workers=1 e2e/game-entry.spec.ts e2e/gameplay.spec.ts`

## Commit Message
```text
feat(game): add a timed start countdown

Plan: 2026-10-23-game-start-polish
Phase: P01-game-start-experience
Task: T02-game-start-countdown

- Count down 3-2-1-GO before new and continued runs
- Respect saved SFX settings and keep input inactive until GO
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
