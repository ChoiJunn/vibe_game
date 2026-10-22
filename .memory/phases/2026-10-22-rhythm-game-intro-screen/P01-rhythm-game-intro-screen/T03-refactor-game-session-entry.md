# Task: T03 Refactor Game Session Entry

## Status: done

## Goal
Render a compact animated game stage immediately at `/game`, read the active session without creating one, and begin/resume Phaser gameplay only after the user explicitly selects the appropriate action.

## Decision Summary
- `GET /api/game/session` is the only request performed during entry discovery. `POST /api/game/session` is deferred until the user selects `게임 시작` or confirms resume through the active-session action.
- Keep session API errors inside the stage with a retry action; preserve current resume, autosave, result, and gesture-gated audio behavior once a session is selected.

## Implementation

### I01. Entry state and explicit session selection
- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas`, session `bootstrap`, `startGameRef`, and `formatGameLoadError` — separate discovery from game initialization; modify.
  - `src/client/game/sessionApi.ts` :: `SessionApiClient.getActive`, `createOrResume` — existing API contract; read-only unless a defect is discovered.
  - `src/app/api/game/session/route.ts` :: `GET`/`POST` — preserve read/create endpoints; read-only.
  - `src/server/cosmos/models.ts` :: `GameSessionDocument` and `RunState` — existing session/snapshot fields; read-only.

#### Details
- **State types**: add a local discriminated entry state in `PhaserCanvas.tsx`, such as:
  ```ts
  type EntryState =
    | { status: 'checking' }
    | { status: 'ready'; activeSession: SessionEnvelope | null }
    | { status: 'starting' }
    | { status: 'error'; message: string; activeSession: SessionEnvelope | null };
  ```
  `SessionEnvelope` is imported from `@/client/game/sessionApi`; the `RunState`/session schema must not be changed.
- **Execution flow / logic**:
  1. As soon as the authenticated component mounts, render `RhythmStagePreview` and start a read-only `api.getActive()` request. Do not call `createOrResume()` in the mount effect.
  2. On a successful active response, set `ready` with its full `SessionEnvelope`. If no session exists, set `ready` with `null`.
  3. If GET fails, retain the preview, set `error`, and show a readable `role="alert"` plus `다시 시도`. Retry only the discovery request; ignore stale responses after unmount and prevent concurrent retries.
  4. When active session exists, offer `이어하기`. On click, initialize the game runtime from that exact envelope and preserve saved snapshot, input archive, pause restoration, terminal result recovery, and autosave logic.
  5. When no active session exists, offer `게임 시작`. Only its click may call `api.createOrResume()`. While the POST is pending, disable duplicate starts and keep the stage visible. On success initialize runtime; on failure show an in-stage error and a retry action that reattempts start without losing the stage.
  6. Factor the current post-envelope logic from `bootstrap` into a local async initializer so it can be called by either resume or explicit create. Keep cleanup (`disposed`, listeners, controller, autosave, Phaser destroy) correct for both entry and gameplay states.
  7. Keep Phaser input start and audio behind a real user gesture. Starting from the entry button counts as the gesture; discovery itself must never start sound.
  8. Keep existing terminal result recovery and `formatGameLoadError` mapping; distinguish an entry API failure from the loading state so the retry control remains available.

### I02. Immersive game entry layout
- Related Files:
  - `src/app/game/page.tsx` :: `GamePage` — remove duplicate title/guide and compose compact stage header, preview/canvas, and short controls; modify.
  - `src/app/globals.css` :: `.game-page`, `.game-page__heading`, `.game-stage-shell`, `.game-frame--stage`, relevant media queries — fill available viewport below top bar; modify.
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` — show compact preview while entry is checking/ready/error; read-only from T01.
  - `e2e/gameplay.spec.ts` :: gameplay and resume journeys — select the explicit new/resume action before asserting Phaser state; modify.

#### Details
- Keep `RequireAuth`, `TutorialOverlay`, leaderboard link, and three short control legends. Remove duplicate hidden headings/paragraphs/leaderboard links that currently exist only to be `display:none`.
- Use a small `STAGE 01` eyebrow, a concise single-line title/control hint, compact right-side actions, and a stage area that flexes to available height. Use `100dvh` accounting for the 4rem top bar and compact `clamp()` padding; avoid the current large title and fixed 16:9-only frame causing excessive page overflow.
- Keep desktop controls adjacent to the stage and wrap them on narrow screens. Preserve keyboard access and focus-visible treatment for entry/retry actions.
- The preview remains mounted/visible while discovery or start is pending/failed. Replace it with/underlay Phaser only after the selected session has initialized successfully.

## Acceptance Criteria
- [x] `/game` displays the stage before session discovery completes and keeps it visible on a 500/network/token error.
- [x] Initial mount performs `GET` only; there is no session `POST` until `게임 시작` is clicked.
- [x] An active session produces `이어하기` and loads its saved run; no active session produces `게임 시작`.
- [x] Retry re-runs the failed operation without requiring a page reload or losing the entry screen.
- [x] Session and Phaser initialization still clean up on unmount; result submission, pause/resume, and audio gesture rules are preserved.
- [x] The game area uses compact responsive spacing and remains usable at mobile widths.

## Validation
- `npx eslint src/components/game/PhaserCanvas.tsx src/app/game/page.tsx e2e/gameplay.spec.ts` — passes; `npm run lint` (repository-wide `eslint .`) produced no output and stalled, so it was stopped.
- `npm run typecheck` — validates discriminated entry state and `SessionEnvelope` use.
- `npm run test:e2e -- --project=edge --workers=1 --grep "player can tune audio|browser back pauses"` — 2 passed.

## Commit Message
```text
feat(game): defer session creation until explicit start

Plan: 2026-10-22-rhythm-game-intro-screen
Phase: P01-rhythm-game-intro-screen
Task: T03-refactor-game-session-entry

- Render the stage while checking saved progress
- Add explicit resume/start and in-stage retry states
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `c3e17e7`
