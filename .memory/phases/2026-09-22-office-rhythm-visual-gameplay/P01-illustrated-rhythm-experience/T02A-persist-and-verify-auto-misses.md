# Task: T02A Persist and Verify Automatic Misses

## Status: done

## Goal
Persist automatic Miss judgements as first-class session events and replay them on the server, so silent misses and automatic failure produce the same verified terminal state as the browser.

## Decision Summary
- Do not fabricate keydown/keyup events for a missed note. Add a discriminated `auto-miss` session event that identifies the chart note and the audio-clock position when it expired.
- Reuse the Space input controller's sequence counter so physical inputs and automatic misses form one ordered, unique event stream.
- Enqueue the auto-miss event synchronously before controller subscribers can submit a terminal result.
- The server accepts an auto-miss only for the current chart event and only strictly after that event's late Good deadline.

## Implementation
### I01. Shared Event Stream and Server Replay
- `src/server/cosmos/models.ts`: extend saved event fields for `auto-miss` and its chart event ID.
- `src/game/input/SpaceInputController.ts`: allocate auto-miss records from the same input sequence and autosave callback.
- `src/game/RhythmGameController.ts`: notify persistence synchronously before applying/emitting automatic Misses.
- `src/components/game/PhaserCanvas.tsx`: connect automatic Misses to the shared persisted input stream.
- `src/server/game/sessionService.ts`: validate auto-miss event shape.
- `src/server/game/resultService.ts` and `src/server/game/verifiedReplay.ts`: replay auto-misses against the authoritative beatmap and deadline.
- Related tests cover sequence ordering, payload validation, exact replay, tampering, and terminal result persistence.

## Acceptance Criteria
- [x] Automatic Misses are queued with unique contiguous sequence numbers beside physical inputs, including before automatic-failure submission.
- [x] Server replay reproduces silent tap/hold misses, consecutive misses, and zero-heart failure.
- [x] Early, wrong-note, duplicate, unordered, and post-terminal automatic Miss events are rejected.
- [x] Physical input, pause/resume, and existing replay behavior remains unchanged.

## Validation
- Focused controller/input/session/replay/result tests — passed (31 tests).
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test -- --run` — passed (26 files, 90 tests).

## Commit Message
```text
fix(persistence): record and verify automatic misses

Plan: 2026-09-22-office-rhythm-visual-gameplay
Phase: P01-illustrated-rhythm-experience
Task: T02A-persist-and-verify-auto-misses

- Persist automatic Misses in the ordered run event stream
- Verify automatic Misses against the authoritative beatmap during replay
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in the canonical workspace task blueprint
