# Task: T02 Start Game From Home Flow

## Status: done

## Goal

After the authenticated player chooses `게임 시작` on the home page, show the tutorial unless they explicitly opted out; let tutorial skip or completion proceed directly into active gameplay; preserve an existing active run with `이어하기` and `새 게임` choices.

## Decision Summary

- Home `게임 시작` currently links to `/game`; it only enters the stage and does not create/start the run.
- `PhaserCanvas` currently checks for an active session, asks for another start click, creates or resumes the session, then asks for a further `리듬 시작` click.
- `TutorialOverlay` currently auto-advances five steps, its skip only dismisses the overlay, and `office-rhythm-manager:tutorial-complete` is written on completion rather than by an explicit opt-out.
- Keep the existing session API, beatmap, audio preferences, and play-start gesture; do not silently abandon a saved session.

## Implementation

### I01. Start intent from the authenticated home CTA

- Related Files:
  - `src/components/auth/LoginButton.tsx` :: `LoginButton` — mark authenticated home navigation as an explicit start intent; modify
  - `src/app/game/page.tsx` :: `GamePage` — retain auth protection, stage/settings header, and game viewport; modify only if tutorial ownership is relocated
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas` — consume start intent and route it into the session state machine; modify

#### Details

- Change the authenticated link destination from `/game` to `/game?start=1`; unauthenticated sign-in behavior, error state, and loading state remain unchanged.
- Read the `start=1` query on the client after mount so server rendering does not access `window`.
- Preserve direct `/game` entry behavior for navigation that has no start intent, except that the tutorial preference and active-session choice rules below still apply.
- Do not create a game session merely because the home page rendered. The explicit authenticated `게임 시작` click is the user action that permits session creation.

### I02. Tutorial display, skip, and opt-out

- Related Files:
  - `src/components/tutorial/TutorialOverlay.tsx` :: `TutorialOverlay` — expose a start callback, immediate skip, and persistent opt-out; modify
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas` — coordinate tutorial callback with session selection/start; modify
  - `src/app/game/page.tsx` :: `GamePage` — move tutorial under the component that can invoke the start intent, or pass an explicit callback bridge; modify

#### Details

- Replace the implicit completion storage semantics with the explicit opt-out key `office-rhythm-manager:tutorial-disabled`; only the player's `다음부터 튜토리얼 하지 않기` action writes the value `true`.
- Do not treat the legacy `office-rhythm-manager:tutorial-complete` key as opt-out, because it was automatically written after tutorial completion.
- Show tutorial by default on game entry unless the explicit opt-out value is `true`.
- Keep the existing tutorial step text and step order. Keep its timed step progression, but do not auto-start merely because the last step's timer expires; the last step's `게임 시작` button starts the run.
- `건너뛰기` calls the same start-intent handler immediately. `다음부터 튜토리얼 하지 않기` persists opt-out and then uses the same start-intent handler.
- The tutorial callback must be safe if session discovery is still pending: store a pending start intent and consume it after `GET /api/game/session` resolves, rather than dropping the action or issuing a duplicate request.
- If the tutorial is disabled and the page URL has `start=1`, begin session selection/creation immediately after audio settings and auth identity are ready. A direct `/game` visit without `start=1` retains an explicit entry action.

### I03. Active-run decision and direct gameplay start

- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `EntryState`, `checkActiveSession`, `startSelectedSession`, `initializeSession`, `startGame`, and entry panel JSX — encode the chosen saved-run flow and start the chart without a redundant CTA; modify
  - `src/client/game/sessionApi.ts` :: `SessionApiClient.closeActiveRun`, `createOrResume` — reuse the existing API operations without changing the API contract; read-only

#### Details

- When active session lookup returns `null` and a start intent is pending, call the existing `api.createOrResume()`, initialize the controller, and start the run. Do not render the `오늘의 업무 리듬을 시작해 볼까요?` / `게임 시작` entry panel or the later `리듬 시작` panel for this path.
- When an active session exists, render distinct `이어하기` and `새 게임` actions. Do not implicitly replace it.
- `이어하기` initializes the active envelope and starts from its saved cursor/state.
- `새 게임` calls `api.closeActiveRun(activeSession.session.id)` before `api.createOrResume()`, then initializes and starts the new run. If closing fails, retain the active run and show a retryable error; never silently start over.
- The controller's `start` must still occur as a consequence of an explicit gesture (tutorial skip, opt-out, final tutorial start, continue, or new game). Do not start audio solely from a timer.
- Preserve existing loading/error messages, retry behavior, settings storage, autosave, resume snapshot behavior, and `window.location.replace('/game')` behavior after leaving a terminal run.
- Ensure repeated tutorial callbacks, retries, and React effects cannot create duplicate sessions or start the same runtime twice; reuse/extend the existing `entryBusy`, `startedInEffect`, and refs as appropriate.

### I04. Browser tests for the requested flow

- Related Files:
  - `e2e/auth-shell.spec.ts` :: `home intro fills desktop and mobile viewports with visible animated art` or a focused authenticated CTA test — assert the authenticated CTA target contains `start=1`; modify
  - `e2e/game-entry.spec.ts` :: home-to-game and game-entry scenarios — cover tutorial skip/start intent, opt-out persistence, direct start with no active run, and continue/new choices with an active run; modify
  - `e2e/support/gameApi.ts` :: `mockGameApi` existing-session fixture — use the existing `existing` option and extend it only if a true active-session branch cannot be tested; modify only if needed
  - `e2e/gameplay.spec.ts` :: existing start/pause scenario — retain proof that the active runtime starts and the pause action appears; modify only if needed

#### Details

- Assert home auth CTA points to `/game?start=1` and still creates no session before the click.
- With no active session, skip or complete the tutorial and assert exactly one session is created and the live gameplay pause control appears without clicking a second `게임 시작` or `리듬 시작` button.
- Assert `다음부터 튜토리얼 하지 않기` writes `office-rhythm-manager:tutorial-disabled=true`, starts the current run, and suppresses the tutorial on the next game entry.
- With an existing active run, assert both `이어하기` and `새 게임` are offered. Continue must reuse the saved run and preserve its cursor; new game must abandon/close the old run before creating the new run.
- Retain tests for explicit `/game` entry, API failures/retries, active-session discovery, and no implicit session creation on home render.
- Do not rely on screenshots or timer sleeps for correctness; wait on visible UI and mocked API request counts.

## Acceptance Criteria

- [ ] The home `게임 시작` action does not lead to a redundant entry screen before play.
- [ ] Tutorial is shown by default; skip and explicit opt-out start the game, and opt-out persists.
- [ ] An active saved run is never silently lost; the user chooses continue or new.
- [ ] A new run starts from the tutorial start gesture with no extra start click and no duplicate session creation.
- [ ] Existing error handling, audio settings, and saved-run recovery remain functional.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm run test:e2e -- --project=chromium --workers=1 e2e/auth-shell.spec.ts e2e/game-entry.spec.ts e2e/gameplay.spec.ts` — startup, tutorial, resume, and gameplay flow passes.

## Commit Message

```text
feat(game): start play from the home action

Plan: 2026-10-23-rhythm-game-start-flow
Phase: P01-direct-game-start
Task: T02-start-game-from-home-flow

- Start gameplay after tutorial or explicit skip
- Preserve saved runs with a continue or new choice
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- Validation: `npm run typecheck`, `npm run lint`, and planned Chromium E2E suite (14 passed).
- commit: pending
