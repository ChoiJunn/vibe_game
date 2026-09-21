# Task: T03 Result Validation

## Status: pending

## Goal

클라이언트가 제출한 입력 이벤트를 고정 beatmap과 서버 기준으로 검증하고, 동일한 상태 전이로 최종 점수를 재계산한 뒤 결과 문서를 저장한다. 중도 실패·완주·포기 기록을 모두 구분 저장한다.

## Decision Summary

- 서버는 클라이언트 최종 점수를 신뢰하지 않는다.
- 판정은 Perfect ±80ms, Good ±160ms, Miss이며 score는 100/60/0이다.
- 결과 기록은 모든 시도를 저장하고, raw input event는 90일 후 정리한다.

## Implementation

### I01. 검증 서비스

- Related Files:
  - `vibe_game/src/server/game/validateRun.ts` :: `validateRun`; new
  - `vibe_game/src/server/game/verifiedReplay.ts` :: `replayInputEvents`; new
  - `vibe_game/src/server/game/validateRun.test.ts` :: tampering/boundary tests; new

#### Details

```typescript
type VerifiedInputEvent = {
  sequence: number;
  type: 'keydown' | 'keyup';
  eventId: string;
  songPositionMs: number;
};

type ValidationResult = {
  valid: boolean;
  result?: GameResultDocument;
  reason?: 'unknown_run' | 'invalid_sequence' | 'impossible_timing' | 'score_mismatch' | 'state_mismatch';
};

function validateRun(
  beatmap: Beatmap,
  initialState: RunState,
  events: VerifiedInputEvent[],
): ValidationResult;
```

- event sequence는 0부터 단조 증가해야 하고 중복 eventId를 허용하지 않는다.
- beatmap에 없는 eventId, note window 밖의 불가능한 이벤트, hold keyup 누락·중복을 거부한다.
- 서버가 `judgeInput`과 `reduceRunState`를 재실행해 score/counts/hearts/combo를 산출한다.
- 클라이언트가 보낸 score·counts·duration은 비교용으로만 사용하고, 결과 source of truth는 replay 결과다.
- 완료·실패·포기 상태는 active session의 현재 status와 terminal command를 함께 검증한다.

### I02. 결과 제출 route와 보관 경계

- Related Files:
  - `vibe_game/src/app/api/game/results/route.ts` :: `POST`; new
  - `vibe_game/src/server/game/resultService.ts` :: `submitResult`; new
  - `vibe_game/src/server/retention/rawEventRetention.ts` :: 90일 정리 policy; new

#### Details

- `POST /api/game/results`는 runId와 input event archive reference를 받아 서버에서 replay한다.
- 검증 실패는 422를 반환하고 점수 문서를 생성하지 않는다. 반복적인 위반은 audit log에 남기되 개인 토큰은 남기지 않는다.
- 성공한 결과는 `daily:{UTC date}`와 `all-time` leaderboard 문서로 조회 가능해야 한다.
- 사용자의 displayName은 제출 시점의 값으로 snapshot하고, 내부 소유권은 oid로 유지한다.
- 원본 input event는 90일 TTL 또는 scheduled cleanup 대상이며, final result는 TTL 없이 보관한다.

## Acceptance Criteria

- [ ] 조작된 final score만 보내도 서버 재계산값으로 대체된다.
- [ ] event 순서·중복·불가능한 timestamp·hold 구조를 검증한다.
- [ ] 완주·실패·포기 결과가 올바른 status로 저장된다.
- [ ] 검증 실패 결과가 순위표에 나타나지 않는다.
- [ ] raw event 보관은 90일, final result 보관은 영구 정책으로 설정된다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/server/game/validateRun.test.ts src/server/game/resultService.test.ts --run`
- `cd vibe_game; npm run build`
- 정상 replay, score tampering, sequence tampering, duplicate event, hold mismatch 시나리오를 각각 실행

## Commit Message

```text
feat(security): validate rhythm results on server

Plan: 2026-09-21-office-rhythm-game
Phase: P03-persistence-competition
Task: T03-result-validation

- Replay fixed beatmap input events on the server
- Store verified completed, failed and abandoned results
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
