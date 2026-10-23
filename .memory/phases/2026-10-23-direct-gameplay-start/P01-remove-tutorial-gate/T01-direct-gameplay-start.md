# Task: T01 Direct Gameplay Start

## Status: done

## Goal
Ensure clicking the home page's game-start CTA enters gameplay without showing the tutorial dialog. Preserve the existing active saved-session choice and `/game` manual entry behavior.

## Decision Summary
- The home route links to `/game?start=1`; that query is the explicit start intent and must be honored without checking a tutorial preference.
- Do not render `TutorialOverlay` in `PhaserCanvas`. When no active session exists, create a session and initialize gameplay immediately. When an active session exists, retain continue/new choices and start gameplay after selection.
- A direct `/game` visit without `?start=1` keeps its current manual entry panel.

## Implementation

### I01. Remove tutorial gate and honor home start intent
- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas`, query initialization, rendered game entry; modify

#### Details
- Remove the `TutorialOverlay` import and JSX instance.
- Set `pendingStartIntentRef.current = true` when the search query contains `start=1`; do not read `office-rhythm-manager:tutorial-disabled`.
- Preserve `checkActiveSession`: when the pending intent is fulfilled and there is no active envelope, call `startSelectedSession('new')`. When an active envelope exists, leave it visible for explicit continue/new choice.
- Preserve direct `/game` entry behavior when query `start` is absent.

### I02. Align entry-flow end-to-end coverage
- Related Files:
  - `e2e/game-entry.spec.ts` :: home CTA, tutorial-dependent cases, saved-session cases; modify
  - `e2e/release-critical-path.spec.ts` :: game entry setup for failed-result cases; modify
  - `e2e/pattern-codex.spec.ts` :: game entry setup; modify only if obsolete tutorial preference setup remains

#### Details
- Replace the home CTA expectation that clicking opens tutorial with an expectation that no dialog appears, the active gameplay control appears, and exactly one session is created.
- Remove tutorial completion/opt-out behavior tests because the overlay is no longer part of entry.
- Update tests that used the tutorial skip button to use the direct `/game?start=1` intent where they need immediate new-session behavior; retain direct `/game` manual-start coverage where the test is about recovery or explicit entry.
- Assert active saved sessions still show continue/new choices and do not get silently replaced.
- Do not use the tutorial-disabled localStorage key in gameplay tests.

## Acceptance Criteria
- [ ] Clicking the home `게임 시작` CTA never shows a dialog and starts a new run when no active saved session exists.
- [ ] A saved active run still presents continue/new choices and neither choice shows the tutorial.
- [ ] `/game` without `?start=1` keeps its explicit manual start panel.
- [ ] No test depends on the tutorial overlay or tutorial opt-out storage key for gameplay entry.

## Validation
- `npm run typecheck`
- `npm run lint`
- `npm run test:e2e -- --project=chromium --workers=1 e2e/game-entry.spec.ts e2e/release-critical-path.spec.ts e2e/pattern-codex.spec.ts`

## Commit Message
```text
fix(game): start gameplay without tutorial gate

Plan: 2026-10-23-direct-gameplay-start
Phase: P01-remove-tutorial-gate
Task: T01-direct-gameplay-start

- Remove the tutorial overlay from game entry
- Honor the home start intent immediately when no saved run exists
- Keep saved-run choices and direct-route manual entry
- Align entry and gameplay E2E coverage
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run typecheck`, `npm run lint`, 29 affected E2E tests)
- commit: included with T01 completion
