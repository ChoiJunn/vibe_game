# Task: T01 검증 입력 시퀀스 정합성 수정

## Status: done

## Goal

실제 게임 입력을 저장한 뒤 같은 beatmap으로 서버에서 재생했을 때 정상적인 completed/failed 플레이가 `422 invalid_sequence`로 거부되지 않도록 한다. 모든 결과는 기존 서버 replay 검증을 계속 통과해야 순위표에 저장된다.

## Decision Summary

- `2026-09-28-rhythm-result-save-recovery.md` D01 및 D05를 따른다. 서버 검증은 유지하며 이벤트 생성·순서·autosave/flush·재생 간 불일치를 고친다.
- 실제 `PhaserCanvas` 입력 경로를 테스트로 재현한다. 검증 실패 조건을 무시하거나 클라이언트 snapshot만으로 순위 결과를 만들지 않는다.

## Implementation

### I01. 입력 기록과 autosave의 재현 가능한 연결

- Related Files:
  - `src/game/input/SpaceInputController.ts` :: `SpaceInputController` — 물리 keydown/keyup 및 auto-miss에 전역 단조 증가 `clientSequence` 부여; modify only if regression demonstrates a defect
  - `src/game/RhythmGameController.ts` :: `applyResult`, `subscribeAutomaticMiss` — terminal freeze 시 held key를 해제하고 자동 Miss를 입력 로거에 전달; modify only if regression demonstrates a defect
  - `src/game/persistence/AutosaveCoordinator.ts` :: `recordInput`, `saveNow`, `flush`, `persist` — 이벤트 배치 저장과 terminal flush; modify
  - `src/server/game/liveInputReplay.test.ts` :: 실제 Space input → controller/automatic miss → autosave → `validateRun` 경로의 통합 회귀 테스트; new
  - `src/game/input/SpaceInputController.test.ts` :: 입력/auto-miss sequence 테스트; modify
  - `src/game/RhythmGameController.test.ts` :: 자동 Miss 알림 및 terminal-release 순서 테스트; modify
  - `src/game/persistence/AutosaveCoordinator.test.ts` :: 동시 입력·진행 중 저장·flush 테스트; modify

#### Details

- **Event Contract**:
  ```typescript
  type VerifiedInputEvent = {
    eventId: string;
    clientSequence: number; // zero-based, unique, contiguous within one run
    type: 'keydown' | 'keyup' | 'auto-miss';
    chartEventId?: string;  // required only for auto-miss
    songPositionMs: number; // finite, non-negative, chronological
    inputOffsetMs?: number; // physical input only; never auto-miss
    receivedAt: string;
  };
  ```
- **Execution Flow / Logic**:
  1. On session bootstrap, initialize the input sequence from `session.inputEvents.length`; verify persisted sequence is actually contiguous before relying on count. Do not silently renumber server history.
  2. Record physical down/up and automatic misses through one run-scoped sequence allocator. Preserve event ordering at callbacks; each automatic miss must refer to the controller's current next chart event and be emitted before terminal state observers run.
  3. Autosave must serialize writes for a run. Events arriving while a batch is in flight remain queued in original order; a terminal `flush(snapshot)` must await the in-flight request and persist every queued event plus the final active-form snapshot before result submission begins.
  4. At terminal state, wait for a physical Space release; retain a matching persisted keyup when the final tap/heart ends on keydown. Do not persist post-terminal gameplay input that the replay engine cannot accept.
  5. Diagnose the reproduced failing invariant (sequence gap/duplicate ID, down-up pairing, event time ordering, wrong auto-miss chart ID/order, dropped concurrent batch, or terminal trailing event) and fix its producer/persistence boundary. Keep a safe reason/index in test diagnostics; do not expose full raw records or identity/token material in an API response.
  - Root cause found: a tap is judged on keydown and advances the chart immediately. If the next chart event is a burst, the matching tap keyup was incorrectly appended as a burst press. Ignore this unmatched keyup so the controller agrees with strict server replay.

### I02. End-to-end server replay regression coverage

- Related Files:
  - `src/server/game/verifiedReplay.ts` :: `replayInputEvents` — replay invariants; modify only if proven server/client semantics disagree
  - `src/server/game/validateRun.ts` :: `validateRun` — exact state and terminal validation; modify only to align with intended game rules, not to accept forged snapshots
  - `src/server/game/resultService.ts` :: `submitResult` — no result writes before replay validation; modify only if needed to propagate safe test diagnostics
  - `src/server/game/verifiedReplay.test.ts` :: malformed and valid replay event cases; modify
  - `src/server/game/validateRun.test.ts` :: terminal state/replay cases; modify
  - `src/server/game/resultService.test.ts` :: rejects invalid stream and writes only verified result; modify

#### Details

- Generate representative event streams from the same input/automatic-miss callbacks used by gameplay and replay them through `validateRun` (not hand-renumbered copies).
- Cover: normal tap key pairs; hold start/end pairs; burst multiple down/up pairs; one and multiple auto-misses; pause/resume with event history; final tap ending on keydown followed by release; terminal failure after the fifth miss; autosave split batches and inputs queued during an in-flight save.
- Assert event sequence is contiguous from zero, IDs unique, song positions nondecreasing, each nonterminal physical press has a release, and auto-miss targets exactly the replay cursor event after its Good deadline.
- For each valid generated stream, the replayed `RunState` must match the game controller's final verified fields and `ResultService` must write exactly the daily and all-time records.
- For malformed/gapped/reordered streams and tampered snapshots, assert validation fails and `ResultRepository.insertResult` is never called.

## Acceptance Criteria

- [x] Controller/input/autosave-generated completed and failed runs replay successfully; coverage includes tap, hold, burst, auto-miss, and terminal release. Existing targeted tests cover malformed logs and autosave sequencing.
- [x] Regression test identifies and prevents the tap-release-to-following-burst mismatch. If the deployed API still rejects a run after this fix, capture its response and investigate any remaining invariant separately.
- [x] Deliberately malformed event logs remain rejected; leaderboard persistence remains strictly after successful server replay (existing server tests pass).
- [x] Repeated/concurrent autosave batches cannot drop, duplicate, reorder, or re-sequence input events (existing autosave tests pass).

## Validation

- `npm run test -- --run src/game/input/SpaceInputController.test.ts src/game/RhythmGameController.test.ts src/game/persistence/AutosaveCoordinator.test.ts src/server/game/verifiedReplay.test.ts src/server/game/validateRun.test.ts src/server/game/resultService.test.ts` — targeted event path and verifier tests pass.
- `npm run test -- --run src/server/game/liveInputReplay.test.ts` — real gameplay input/autosave streams replay successfully.
- `npm run typecheck` — no TypeScript errors.
- `npx eslint src/game/RhythmGameController.ts src/game/RhythmGameController.test.ts src/server/game/liveInputReplay.test.ts` — changed files lint clean. (`npm run lint` also traverses the pre-existing untracked `.deploy-package-97843d1/.next` deployment output and fails on generated JavaScript there.)

## Commit Message

```text
fix(game): keep persisted rhythm inputs replay-verifiable

Plan: 2026-09-28-rhythm-result-save-recovery
Phase: P01-verified-save-and-new-game
Task: T01-repair-verified-input-sequence

- Reproduce the invalid_sequence stream using the live gameplay event path
- Preserve strict server validation while fixing event persistence ordering
```

## Progress

- [x] 구현 완료
- [x] 검증 통과: 7 files / 42 tests; `npm run typecheck`; targeted ESLint.
- commit: included in `fix(game): keep persisted rhythm inputs replay-verifiable`
