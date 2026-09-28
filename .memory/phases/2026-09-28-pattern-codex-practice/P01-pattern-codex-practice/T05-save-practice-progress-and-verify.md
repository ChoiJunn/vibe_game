# Task: T05 Save Practice Progress and Verify the Full Flow

## Status: complete

## Goal

Persist each completed loop against its exact source variation, show aggregate progress on kind cards, show the requested combined summary only when leaving a practice session, and add browser-level regression coverage for the complete catalog → practice → touch/keyboard → loop → save → summary flow.

## Decision Summary

- Follow D04/D08/D10: persist completed loops separately per variation; aggregate progress at the kind level; ignore the current incomplete loop at exit; show completed-loop count, best accuracy, and cumulative P/G/M in the exit summary.
- Keep progress in existing user-keyed localStorage and preserve compatible mastery/badge history. Storage failures must not terminate practice or prevent returning to the catalog.
- Preserve selected category/variation navigation when returning from the summary.

## Implementation

### I01. Per-variation loop persistence and kind aggregates

- Related Files:
  - `src/client/game/patternCodexStore.ts` :: `PatternMastery`, `PatternCodex`, `recordPatternPractice`, `savePatternCodex`; modify only for missing aggregate-safe fields
  - `src/client/game/patternCodexStore.test.ts` :: completed loop counts, best accuracy, mastery/badge rules, user isolation, unavailable storage; modify
  - `src/components/practice/PatternCodex.tsx` :: stable loop callback, per-kind aggregate rendering, storage warning; modify
  - `src/components/practice/PracticeViewport.tsx` :: consume one immutable callback per completed loop; modify
  - `src/components/practice/PracticeRunController.ts` :: `PracticeLoopResult` and completed-loop callback from T03; read-only unless an integration correction is required

#### Details

- Keep `PatternMastery` keyed by original source `patternId`, not by category kind or presentation ordinal. For each completed loop call `recordPatternPractice` exactly once with `terminalStatus:'completed'`, loop accuracy, perfect count, pattern ID, and timestamp, then save the resulting codex under current `user.oid` and beatmap ID.
- Category aggregate for each `PatternGroup` is derived from its variation IDs and codex entries: mastered variation count / total variations, total completed attempts, and best accuracy across variations. Missing entries count as zero; never treat a hidden/unknown variation as mastered.
- Preserve existing badge thresholds and IDs unless a test shows the grouping change would alter their meaning. Since D10 says preserve compatible progression, mastery is still evaluated per authored variation.
- Keep `PatternCodex` completion callback stable across codex state updates, and memoize the selected `PracticeChart` by source pattern ID. This is required because `PracticeViewport` currently recreates its runtime when `beatmap` or `onComplete` identity changes; otherwise saving one loop can remount/reset the endless practice session.
- Wrap reads/writes in recoverable storage handling at the component boundary. If `window.localStorage` access or `setItem` throws, leave the in-memory codex updated, show an inline “이 브라우저에서는 연습 기록을 저장하지 못했어요” warning, and let the session continue/exit.
- Do not persist a loop on pause, restart, or exit before completion. Re-entering the same variant displays its saved attempt count, best accuracy, and mastered status.

### I02. Exit summary and navigation lifecycle

- Related Files:
  - `src/components/practice/PracticeViewport.tsx` :: summary transition and return action; modify
  - `src/components/practice/PatternCodex.tsx` :: selected kind/variation restoration; modify
  - `src/app/globals.css` :: summary, progress badges, save-warning styles; modify
  - `e2e/pattern-codex.spec.ts` :: full practice lifecycle, persistence, and touch regression coverage; new or extend T02/T04 tests

#### Details

- Exiting stops input, frame scheduling, audio, and controller before showing a summary in the practice view. Summary fields: completed loops, highest completed-loop accuracy, cumulative perfect/good/miss counts. Do not include the incomplete current loop in these values.
- If no loop completed, clearly say no attempt was recorded and provide a `패턴 목록` action. Otherwise provide `계속 연습` (starts a fresh loop without resetting saved history) and `패턴 목록` actions. Returning to the catalog restores the selected kind and variation list.
- A return action must work after localStorage throws; do not leave the summary button in a busy/disabled state.

### I03. Full user-flow E2E and suite validation

- Add deterministic E2E scenarios:
  1. Browse localized grouped catalog → open a kind → select a named variation → verify its actual mini beat preview and practice title.
  2. Start with keyboard Space on desktop and on-screen pointer on a touch context. Verify an intentionally late/no input becomes MISS, correctly timed tap/hold/burst inputs receive the same judgement classes as the game, and low accuracy never causes game over.
  3. Let two full loops complete automatically with no inter-loop modal; verify both are saved to that variation, kind aggregate advances, and session totals update.
  4. Exit halfway through a loop; verify only completed loops appear in local storage and summary.
  5. Return to the variation list, navigate elsewhere, and reload; verify per-user variation progress survives and category aggregate is correct.
  6. Make localStorage throw; verify practice continues and exit/navigation remain usable with a visible save warning.
- Use deterministic beatmap/test clock hooks or the existing short E2E beatmap pattern only under E2E auth mode; do not change production beatmap content to make tests pass.
- Verify no game-results API call or leaderboard row is created by practice.

## Acceptance Criteria

- [ ] Completed loops update only their source variation and category aggregates recalculate correctly.
- [ ] The summary appears only on explicit exit, contains the agreed fields, and excludes a partial loop.
- [ ] Saving progress does not remount/restart the live session; multiple loops can complete without user confirmation.
- [ ] Local progress survives reload and remains isolated by user; storage failures do not block play or navigation.
- [ ] Keyboard/touch full-flow E2E passes and practice never submits a leaderboard result.

## Validation

- `npm run test -- --run src/client/game/patternCodexStore.test.ts src/game/practice/PracticeRunController.test.ts`
- `npx playwright test e2e/pattern-codex.spec.ts --project=chromium`
- `npm run test -- --run`
- `npm run typecheck`
- `npx eslint src e2e` (use source and E2E paths explicitly; root `npm run lint` also scans the unrelated untracked deployment package in this workspace)
- `npm run build`

## Commit Message

```text
feat(practice): persist variation mastery and session summaries

Plan: 2026-09-28-pattern-codex-practice
Phase: P01-pattern-codex-practice
Task: T05-save-practice-progress-and-verify

- Track each completed loop by its original pattern variation
- Verify grouped catalog, continuous practice, touch input, and exit summary
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
