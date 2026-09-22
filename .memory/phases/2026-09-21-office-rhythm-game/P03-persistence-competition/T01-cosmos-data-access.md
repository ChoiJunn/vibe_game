# Task: T01 Cosmos Data Access

## Status: done

## Goal

Azure Cosmos DB API for NoSQL에 접근하는 서버 전용 data layer를 만들고, 진행 세션과 완료 결과를 별도 문서 유형으로 저장할 수 있는 schema·partition key·repository 계약을 확정한다.

## Decision Summary

- Cosmos DB API for NoSQL을 사용한다.
- 진행 세션과 완료 결과를 별도 문서로 저장한다.
- 사용자당 진행 세션은 하나만 허용한다.
- 최종 결과는 계속 보관하고 raw input events는 90일 후 정리한다.

## Implementation

### I01. Cosmos client와 container 설정

- Related Files:
  - `vibe_game/src/server/cosmos/client.ts` :: `getCosmosClient`; new
  - `vibe_game/src/server/cosmos/containers.ts` :: `getGameContainers`; new
  - `vibe_game/src/server/cosmos/env.ts` :: 환경 검증; new
  - `vibe_game/scripts/cosmos-init.ts` :: 개발/배포용 container 초기화; new

#### Details

- 서버에서만 import 가능한 모듈로 분리하고 `NEXT_PUBLIC_` 환경변수로 Cosmos secret을 노출하지 않는다.
- App Service 운영에서는 Managed Identity credential을 사용하고, 로컬 개발에서만 명시적 credential을 허용한다.
- 권장 container는 `gameSessions`와 `gameResults` 두 개다.
- `gameSessions` partition key: `/userOid`; `gameResults` partition key: `/leaderboardKey`.
- `leaderboardKey`는 `daily:{YYYY-MM-DD}` 또는 `all-time` 형식으로 정규화한다.

### I02. 문서 스키마와 repository

- Related Files:
  - `vibe_game/src/server/cosmos/models.ts` :: `GameSessionDocument`, `GameResultDocument`; new
  - `vibe_game/src/server/cosmos/sessionRepository.ts` :: `SessionRepository`; new
  - `vibe_game/src/server/cosmos/resultRepository.ts` :: `ResultRepository`; new
  - `vibe_game/src/server/cosmos/repositories.test.ts` :: serialization/query tests; new

#### Details

```typescript
type GameSessionDocument = {
  id: string; // runId
  type: 'gameSession';
  userOid: string;
  tenantId: string;
  beatmapId: 'office-day-01';
  status: 'active' | 'paused';
  snapshot: RunState;
  inputEvents: VerifiedInputEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

type GameResultDocument = {
  id: string;
  type: 'gameResult';
  userOid: string;
  displayName: string;
  beatmapId: string;
  leaderboardKey: string;
  status: 'completed' | 'failed' | 'abandoned';
  score: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  durationMs: number;
  playedAt: string;
  rawEventArchiveRef?: string;
  schemaVersion: 1;
};
```

- Repository method 계약: `getActiveByUser`, `create`, `replaceSnapshot`, `appendEvent`, `markTerminal`, `insertResult`, `queryLeaderboard`.
- userOid 외 tenantId를 문서에 포함해 테넌트 경계를 검증한다.
- 문서 version과 ETag를 사용해 stale autosave가 최신 snapshot을 덮어쓰지 않게 한다.

## Acceptance Criteria

- [ ] Cosmos client가 브라우저 bundle에 포함되지 않는다.
- [ ] session/result 문서 schema와 partition key가 문서화되어 있다.
- [ ] 사용자별 active session을 하나만 조회할 수 있다.
- [ ] ETag 충돌이 일반 오류로 뭉개지지 않고 재조회 경로로 전달된다.
- [ ] raw input event와 최종 결과의 보관 정책 필드가 존재한다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/server/cosmos --run`
- `cd vibe_game; npm run build`
- 권한이 있는 Azure 개발 Cosmos DB에서 container/partition key 생성과 CRUD smoke test

## Commit Message

```text
feat(storage): add cosmos session and result repositories

Plan: 2026-09-21-office-rhythm-game
Phase: P03-persistence-competition
Task: T01-cosmos-data-access

- Add server-only Cosmos NoSQL client and containers
- Define session and result document repositories with ETag safety
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
