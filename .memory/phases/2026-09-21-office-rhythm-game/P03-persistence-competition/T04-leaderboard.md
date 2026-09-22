# Task: T04 Leaderboard

## Status: done

## Goal

서버 검증을 통과한 모든 플레이 기록을 오늘의 순위와 전체 누적 순위로 조회하고, 한 사용자가 여러 기록으로 여러 순위를 차지할 수 있게 표시한다. 정렬은 점수 내림차순 → Perfect 개수 → 플레이 시간 순이다.

## Decision Summary

- 오늘의 순위와 전체 누적 순위를 함께 제공한다.
- 모든 플레이 기록을 표시하며 사용자별 최고 기록만으로 축약하지 않는다.
- 표시 이름은 결과 저장 시점의 Entra displayName snapshot이다.

## Implementation

### I01. leaderboard query API

- Related Files:
  - `vibe_game/src/app/api/leaderboard/route.ts` :: `GET`; new
  - `vibe_game/src/server/leaderboard/leaderboardService.ts` :: `getLeaderboard`; new
  - `vibe_game/src/server/leaderboard/leaderboardService.test.ts` :: ordering/date tests; new

#### Details

- `GET /api/leaderboard?scope=daily|all-time&limit=50&continuationToken=...`를 제공한다.
- daily는 UTC 기준 `daily:YYYY-MM-DD` partition을 사용하고 all-time은 `all-time` partition을 사용한다.
- 정렬은 `score DESC`, `perfectCount DESC`, `durationMs ASC`, `playedAt ASC` 순이다.
- Cosmos continuation token을 opaque string으로만 반환하고 클라이언트가 내부 token 구조를 해석하지 않는다.
- `limit`은 1~100 사이로 제한한다.

### I02. 순위표 UI

- Related Files:
  - `vibe_game/src/app/leaderboard/page.tsx` :: `LeaderboardPage`; modify
  - `vibe_game/src/components/leaderboard/LeaderboardTabs.tsx` :: daily/all-time; new
  - `vibe_game/src/components/leaderboard/LeaderboardTable.tsx` :: rows; new
  - `vibe_game/src/components/leaderboard/LeaderboardRow.tsx` :: rank/displayName/status; new

#### Details

- 한 사용자의 여러 기록은 각각 별도 row로 표시한다.
- row에는 순위, displayName, score, Perfect 수, duration, 완주/실패/포기 상태, playedAt을 표시한다.
- 순위표는 login user만 볼 수 있다.
- loading, empty, API error, pagination 상태를 각각 표시한다.
- displayName은 HTML escape/React text rendering으로 출력하고 raw HTML을 허용하지 않는다.

## Acceptance Criteria

- [x] daily와 all-time 탭이 동일한 row 계약으로 작동한다.
- [x] 한 사용자의 여러 기록이 모두 표시된다.
- [x] 서버 정렬 기준이 UI 표시 순서와 일치한다.
- [x] 중도 실패·포기 기록이 상태 배지로 구분된다.
- [x] Cosmos pagination과 API 오류가 사용자에게 안전하게 표시된다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/server/leaderboard src/components/leaderboard --run`
- `cd vibe_game; npm run build`
- 인증 mock과 seed 결과 3건으로 daily/all-time 정렬·다중 기록을 수동 확인

## Commit Message

```text
feat(leaderboard): add daily and all time score boards

Plan: 2026-09-21-office-rhythm-game
Phase: P03-persistence-competition
Task: T04-leaderboard

- Query verified results with deterministic ranking order
- Show all attempts with completion status and display names
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: committed
