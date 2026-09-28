# Task: T02 미저장 결과 24시간 임시 보관

## Status: done

## Goal

결과 저장 또는 terminal autosave가 실패하면 사용자에게 서버 미저장임을 명확히 알리면서, 해당 사용자의 최신 실패 1건을 브라우저에 24시간 보관해 원인 확인/복구 자료를 잃지 않게 한다.

## Decision Summary

- D01/D02/D04를 따른다. 서버 검증 실패 결과는 leaderboard에 넣지 않는다. 브라우저에 사용자별 최신 1건만 최대 24시간 보관하고 인증 토큰/Authorization 헤더는 절대로 기록하지 않는다.
- 저장소가 차단되거나 quota 오류가 나도 게임 탈출/새 게임 흐름은 막지 않는다. 로컬 보관 성공을 서버 저장 성공으로 표현하지 않는다.

## Implementation

### I01. 실패 결과 저장소

- Related Files:
  - `src/client/game/failedRunStore.ts` :: `FailedRunStore` 및 record type — localStorage read/write/expiry/clear; new
  - `src/client/game/failedRunStore.test.ts` :: storage serialization, expiry, user isolation, malformed data tests; new
  - `src/server/cosmos/models.ts` :: `VerifiedInputEvent`, `TerminalRunStatus` — type-only reuse; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  export type FailedRunRecord = {
    schemaVersion: 1;
    userOid: string;
    runId: string;
    savedAtMs: number;
    expiresAtMs: number; // savedAtMs + 86_400_000
    terminalStatus: 'completed' | 'failed' | 'abandoned';
    claimedSnapshot: RunState;
    inputEvents: VerifiedInputEvent[];
    failure: { httpStatus?: number; code: string };
  };

  export function readFailedRun(
    storage: Pick<Storage, 'getItem' | 'removeItem'>,
    userOid: string,
    nowMs?: number,
  ): FailedRunRecord | null;
  export function writeFailedRun(
    storage: Pick<Storage, 'setItem'>,
    record: FailedRunRecord,
  ): void;
  export function clearFailedRun(
    storage: Pick<Storage, 'getItem' | 'removeItem'>,
    userOid: string,
    runId: string,
  ): void;
  ```
- **Schema/Storage Contract**:
  - Use one versioned key per authenticated Entra `userOid` (e.g. `office-rhythm:failed-run:v1:${userOid}`); each key holds only its newest record.
  - Store only run ID, score snapshot, terminal status, verified input-event archive, timestamps, and sanitized failure status/code. Do not store displayName, ID/access tokens, auth headers, Cosmos credentials, or raw exception text.
  - Expiry is exactly 24 hours after failure is archived. On read, delete malformed, unsupported schema, mismatched-user, or expired data and return `null`. A subsequent failure replaces the prior record for that same user.
  - Catch `Storage` access, quota, and JSON parse errors at the caller boundary; they must not prevent visible error state or session abandonment.

### I02. Archive and clear at terminal result boundary

- Related Files:
  - `src/components/game/PhaserCanvas.tsx` :: bootstrap, input callback, `submitTerminal`, `submission` state — track full event archive and write/clear local record; modify
  - `src/client/game/sessionApi.ts` :: `SessionApiError` — reuse sanitized `status` and `code`; read-only unless a testable type adjustment is needed
  - `src/components/results/ResultSummary.tsx` :: submission status text; modify
  - `src/components/results/ResultSummary.test.tsx` :: saved/pending/error/local-retention messaging assertions; modify

#### Details

- **Execution Flow / Logic**:
  1. Bootstrap an in-memory archive from `envelope.session.inputEvents`; append each newly created `VerifiedInputEvent` in the same callback that gives it to `AutosaveCoordinator.recordInput`.
  2. Await `input.waitForRelease()` and `autosave.flush(...)` before `api.submitResult(...)`, preserving the existing verified-result order.
  3. If flush or result submission fails, save a `FailedRunRecord` containing final claimed snapshot, complete in-memory event archive, terminal status, current timestamp/expiry, and only safe error status/code. Transition to error state in `finally`-safe code; no definitive HTTP failure may leave the UI in `saving`.
  4. If result submission succeeds, clear only the stored record matching the current `userOid` and `runId`, then mark `saved`.
  5. The summary must differentiate server-confirmed saved, actively saving, and failed/not on leaderboard (local copy held for up to 24 hours). If local storage fails, state that the result was not server-saved without claiming it was archived.

## Acceptance Criteria

- [x] Result failure writes one sanitized record per user with all input events and exactly 24-hour expiry.
- [x] A later failed run replaces the prior record for that user; per-user keys isolate other users.
- [x] Expired/malformed/version-unknown records are deleted on read; successful server submission removes only its matching local record.
- [x] No auth token/header or raw server error is serialized; localStorage errors do not prevent the error state or new-game attempt.
- [x] The failed-save UI says the result is not on the leaderboard and distinguishes a local 24-hour copy from unavailable storage.

## Validation

- `npm run test -- --run src/client/game/failedRunStore.test.ts src/components/results/ResultSummary.test.tsx` — storage lifecycle and UI state tests pass.
- `npm run typecheck` — no TypeScript errors.
- `npx eslint src/client/game/failedRunStore.ts src/client/game/failedRunStore.test.ts src/components/game/PhaserCanvas.tsx src/components/results/ResultSummary.tsx src/components/results/ResultSummary.test.tsx` — changed files lint clean. Full-repository lint also traverses untracked generated deployment output as noted in T01.

## Commit Message

```text
feat(game): retain one failed result locally for 24 hours

Plan: 2026-09-28-rhythm-result-save-recovery
Phase: P01-verified-save-and-new-game
Task: T02-retain-unsaved-result-24h

- Store only the latest token-free failed run per user with a 24-hour TTL
- Distinguish local recovery data from server-confirmed leaderboard saves
```

## Progress

- [x] 구현 완료
- [x] 검증 통과: 2 files / 6 tests; `npm run typecheck`; targeted ESLint.
- commit: included in `feat(game): retain one failed result locally for 24 hours`
