# Task: T03 저장 실패 후 새 게임 안전하게 시작

## Status: pending

## Goal

결과 제출이 `422 invalid_sequence` 또는 다른 확정 실패로 끝나도 사용자가 “새 게임”을 선택하면 이전 run을 안전하게 종료하고 새로운 활성 run으로 이동하게 한다. 이전 active lock을 해제할 수 없는 경우에는 버튼을 다시 활성화하고 원인을 알 수 있는 재시도 오류를 표시한다.

## Decision Summary

- D03/D04를 따른다. 결과 재제출 실패 자체는 새 게임의 차단 사유가 아니며, 서버에 검증되지 않은 결과를 만들지 않는다.
- 사용자당 활성 세션은 하나라는 기존 규칙을 유지한다. 이전 세션이 같은 run임을 확인한 뒤 종료하고, ETag 충돌은 최신 세션을 다시 조회해 제한적으로 재시도한다. 다른 run을 임의로 종료하지 않는다.

## Implementation

### I01. 멱등적 이전 세션 종료와 새 run 이동

- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: `exitToNewGameRef`, `onExit`, `exitError`, `exiting` — 기존 run 종료·navigation·실패 복구; modify
  - `src/client/game/sessionApi.ts` :: `getActive`, `abandon`, `SessionApiError` — active session 조회와 ETag 조건부 종료; modify only if a narrow API helper is needed
  - `src/server/game/sessionService.ts` :: `abandon` — 기존 active lock 해제 동작; only modify if integration tests show server contract defect
  - `src/server/cosmos/sessionRepository.ts` :: `getActiveByUser`, `markTerminal` — active lock/terminal contract; read-only unless a regression proves a server defect
  - `src/server/game/sessionService.test.ts` :: active run lifecycle/etag conflict tests; modify

#### Details

- **Execution Flow / Logic**:
  1. When the result “new game” action is clicked, guard duplicate clicks with the existing `exiting` state.
  2. Await the current terminal submission promise, but swallow its failure only for purposes of moving on; T02 must already have archived the failed run when possible.
  3. Fetch the current active session. If there is no active session, the prior run is already closed and navigation may continue. If its run ID differs from the run shown in this result modal, do not abandon it; surface a recoverable error and stay on the page.
  4. If it matches, call `api.abandon(runId, latestVersion, true)`. On `SessionApiError` 412 only, fetch the active session once more: continue if absent/already terminal; retry abandon once using the fresh version if it is still the same run; never loop indefinitely. Do not retry authorization, validation, not-found, or 5xx failures as if they were ETag conflicts.
  5. Navigate with `window.location.replace('/game')` only after the active slot is confirmed free. The normal game bootstrap then obtains a new session. If transition fails, keep the result modal, show a concise recoverable error, and reset `exiting` so the user can retry.

### I02. Result UI and end-to-end regression coverage

- Related Files:
  - `src/components/results/ResultSummary.tsx` :: submission label and action button states; modify
  - `src/components/results/ResultSummary.test.tsx` :: action visibility/disabled state and unsaved error; modify
  - `e2e/support/gameApi.ts` :: `mockGameApi` test state and failure injection for 422 result plus 412/5xx abandon; modify
  - `e2e/release-critical-path.spec.ts` :: result failure/new-game/retry flows; modify
  - `src/client/game/sessionApi.test.ts` :: `getActive`/`abandon` HTTP contract and ETag 412 behavior; new

#### Details

- “다시 플레이/저장 재시도” remains a result retry action; “새 게임” is independently usable after a terminal result has either saved or definitively failed. While an HTTP request is still pending, show the pending state; after a response failure, switch to error state and re-enable actions.
- Keep “새 게임” disabled only while its own transition is executing. A failed result request must not leave the whole modal permanently busy.
- Do not report local archive as a server save. Use distinct Korean status text for: saving, saved/leaderboard-confirmed, server save failed with a local 24-hour recovery copy, and server save failed with no local copy because browser storage was unavailable.
- Extend the mock API so `/api/game/results` can return a deterministic `{ error, code: 'invalid_sequence' }` with status 422 without terminalizing/inserting a result. Its `abandon` route must model ETag 412 and recovery by a fresh version.
- Playwright release path: start a test run, reach terminal result, return 422, assert no result/leaderboard row; click “새 게임”; verify old run was abandoned, a new run ID is active, the tutorial/start state appears, and the old result is still marked unsaved locally. Add a second case where abandon returns 412 once and fresh-version retry succeeds, plus a persistent abandon failure that leaves the page in place with enabled retry and visible error.

## Acceptance Criteria

- [ ] A 422 result response transitions the dialog out of `saving`; the unsaved status remains explicit.
- [ ] “새 게임” after a failed result request closes only the same run and opens a fresh active session; no unverified result appears in the leaderboard mock.
- [ ] A single stale ETag is recovered by one fresh active-session fetch and one retry; no unbounded retries occur.
- [ ] A persistent abandon/API error does not navigate away, does not abandon another run, shows an actionable error, and re-enables the new-game action.
- [ ] Existing successful save-and-play-again, pause/resume, and active-session uniqueness behavior remains intact.

## Validation

- `npm run test -- --run src/components/results/ResultSummary.test.tsx src/server/game/sessionService.test.ts src/client/game/sessionApi.test.ts` — targeted lifecycle and API behavior passes.
- `npx playwright test e2e/release-critical-path.spec.ts --project=chromium` — result retry and failed-save/new-game scenarios pass.
- `npm run test -- --run` — complete Vitest suite passes.
- `npm run typecheck` and `npm run lint` — pass.
- `npm run build` — production build succeeds.

## Commit Message

```text
fix(game): allow safe new runs after result save failure

Plan: 2026-09-28-rhythm-result-save-recovery
Phase: P01-verified-save-and-new-game
Task: T03-unblock-safe-new-game

- Finalize the old active session with bounded ETag conflict recovery
- Keep result failure visible while allowing a fresh game to start
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
