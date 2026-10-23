# Task: T01 Center Saved Session Dialog

## Status: done

## Goal
When a saved active session is found, replace the left-bottom continue/new choice panel with a centered modal over the game stage. Preserve the saved session until the user explicitly chooses `이어하기` or `새 게임`.

## Decision Summary
- Keep the explicit continue/new decision; do not auto-continue and do not discard saved progress on entry.
- Center the choice over the game stage regardless of whether the user entered through `/game?start=1` or `/game`.
- Keep the no-saved-session start panel and load-error UI behavior unchanged.

## Implementation

### I01. Separate active-save dialog presentation from ordinary entry and errors
- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas` entry-state render; modify
  - `src/app/globals.css` :: `.game-entry-panel`, add saved-session overlay/dialog modifiers; modify

#### Details
- Render a saved-session overlay only when `runtime` is absent, `entryState.status === 'ready'`, and `entryState.activeSession !== null`.
- Give the overlay dialog semantics: `role="dialog"`, `aria-modal="true"`, and a labelled heading via `aria-labelledby`. Focus the `이어하기` action when the dialog mounts; keep the two actions in logical keyboard order.
- Keep button handlers bound to `selectSessionRef.current?.('continue')` and `selectSessionRef.current?.('new')`; do not change `startSelectedSession` API semantics.
- Render `checking`, no-session `ready`, and `error` states with the existing entry panel presentation. Keep the direct `/game` no-save `게임 시작` button.
- Style the overlay relative to `.game-play-surface`: `position:absolute; inset:0; display:grid; place-items:center; padding:1rem;` with a subdued backdrop. Style its dialog card with `width:min(28rem, 100%)`, the existing dark translucent/yellow palette, readable contrast, and responsive padding. Remove the left/bottom positioning from the saved-session dialog modifier only; do not move the general entry/error panel.
- Ensure the dialog remains centered within the stage at desktop and mobile widths and does not cover or clip the primary action buttons.

### I02. Update saved-session entry coverage
- Related Files:
  - `e2e/game-entry.spec.ts` :: saved active-session continue/new scenarios; modify

#### Details
- Assert that an active save shows one visible `role=dialog` with both `이어하기` and `새 게임` actions.
- Assert that the dialog's bounding-box center is within a small tolerance of the `.game-play-surface` center at desktop and narrow viewport sizes.
- Assert that choosing `이어하기` resumes the existing session without creating a new one.
- Assert that choosing `새 게임` closes the previous active run before creating a new session.
- Retain checks that an empty session starts immediately for `/game?start=1` and that direct `/game` without a saved session keeps its explicit start action.

## Acceptance Criteria
- [x] Saved-session choices appear centered in the game stage and expose dialog semantics.
- [x] Continue preserves the current session; new game closes it only after explicit selection.
- [x] Empty-session and error entry behavior remain unchanged.
- [x] The dialog stays centered and usable on narrow screens.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm run test:e2e -- --project=chromium --workers=1 e2e/game-entry.spec.ts`

## Commit Message
```text
fix(game): center saved-session choice dialog

Plan: 2026-10-23-game-start-polish
Phase: P01-game-start-experience
Task: T01-center-saved-session-dialog

- Show continue and new-game choices in a centered modal
- Preserve saved-session entry behavior and responsive layout
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
