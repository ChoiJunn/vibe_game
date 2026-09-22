# Task: T02 Session API

## Status: done

## Goal

사용자당 하나의 진행 중 게임 세션을 생성하고, 주요 이벤트·주기적 snapshot을 저장하며, 브라우저 뒤로가기·새로고침·탭 종료 후 정확한 상태를 복원하는 Next.js server API를 구현한다.

## Decision Summary

- 주요 이벤트마다 저장하고 이동 중에는 주기적으로 저장한다.
- 게임을 완료하거나 명시적으로 포기하기 전까지 active session을 유지한다.
- 정확한 곡 위치, 하트, 콤보, 점수, event cursor를 복원한다.

## Implementation

### I01. API route 계약

- Related Files:
  - `vibe_game/src/app/api/game/session/route.ts` :: `POST`, `GET`; new
  - `vibe_game/src/app/api/game/session/events/route.ts` :: `POST`; new
  - `vibe_game/src/app/api/game/session/pause/route.ts` :: `POST`; new
  - `vibe_game/src/app/api/game/session/abandon/route.ts` :: `POST`; new
  - `vibe_game/src/server/game/sessionService.ts` :: `SessionService`; new

#### Details

- `POST /api/game/session`: active session이 없으면 생성하고, 있으면 기존 session metadata를 반환한다.
- `GET /api/game/session`: 로그인 사용자 `oid`의 active session과 snapshot을 반환한다.
- `POST /api/game/session/events`: `{ runId, clientSequence, events[] }`를 받아 서버 검증 전 raw event를 append한다.
- `POST /api/game/session/pause`: `{ runId, snapshot, reason }`을 받아 pause 상태 snapshot을 replace한다.
- `POST /api/game/session/abandon`: `{ runId, expectedVersion }`을 검증한 뒤 session을 terminal abandoned 처리한다.
- 모든 route는 인증 컨텍스트의 `oid`, `tenantId`를 사용하고 request body의 user ID를 신뢰하지 않는다.
- 이미 다른 active session이 있으면 새 session 대신 409와 기존 runId를 반환한다.

### I02. autosave client adapter

- Related Files:
  - `vibe_game/src/client/game/sessionApi.ts` :: `SessionApiClient`; new
  - `vibe_game/src/game/persistence/AutosaveCoordinator.ts` :: `AutosaveCoordinator`; new
  - `vibe_game/src/game/persistence/AutosaveCoordinator.test.ts` :: debounce/retry tests; new

#### Details

- save trigger는 note judgement, pause, visibility change, terminal state, 그리고 이동 중 주기적 interval이다.
- snapshot은 `runId`, `cursorMs`, `nextEventIndex`, hearts, combo, consecutivePerfects, score, counts, status를 포함한다.
- 일시적 네트워크 오류는 지수 backoff로 재시도하되, gameplay thread를 block하지 않는다.
- ETag/version 충돌은 최신 서버 상태를 조회해 사용자에게 resume conflict UI를 제공한다. 조용히 덮어쓰지 않는다.
- 브라우저 종료 시 `navigator.sendBeacon`은 보조 수단으로만 사용하고, 정확성은 마지막 주요 이벤트 저장에 의존한다.

## Acceptance Criteria

- [ ] 동일 사용자에게 active session이 2개 생기지 않는다.
- [ ] refresh/back/tab close 후 GET session으로 마지막 snapshot을 받을 수 있다.
- [ ] pause/resume에서 song position과 event cursor가 유지된다.
- [ ] abandon은 확인된 요청에서만 terminal 상태로 바뀐다.
- [ ] 네트워크 오류와 ETag 충돌이 사용자에게 표시되고 데이터가 조용히 유실되지 않는다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/server/game src/client/game/sessionApi.ts --run`
- `cd vibe_game; npm run build`
- 인증 mock으로 create → event save → pause → GET resume → abandon 시나리오 실행

## Commit Message

```text
feat(storage): add resumable game session api

Plan: 2026-09-21-office-rhythm-game
Phase: P03-persistence-competition
Task: T02-session-api

- Add single-active-session API and autosave coordinator
- Preserve pause and resume snapshots across browser lifecycle events
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (typecheck, targeted ESLint, 15 tests, production build)
- Cosmos CRUD smoke skipped: COSMOS_ENDPOINT/DATABASE/KEY/AUTH_MODE are not configured.
- Full repository lint still reports the two pre-existing TutorialOverlay errors.
- commit:  feat(storage): add resumable game session api
