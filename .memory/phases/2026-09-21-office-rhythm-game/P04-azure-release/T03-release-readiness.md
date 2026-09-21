# Task: T03 Release Readiness

## Status: pending

## Goal

빈 레포에서 실제 운영 가능한 게임으로 인수할 수 있도록 로컬 실행·Azure 설정·데이터 정책·검증 결과를 README에 정리하고, 핵심 요구사항의 최종 release checklist를 통과시킨다.

## Decision Summary

- 구현 산출물은 `vibe_game/`에서 실행한다.
- 로그인, 실제 플레이, 중간저장·뒤로가기 복원, 독창적 사무실 리듬게임, 오늘/전체 순위가 필수다.
- 관리자 화면은 첫 릴리스에 포함하지 않는다.

## Implementation

### I01. README와 운영 문서

- Related Files:
  - `vibe_game/README.md` :: 로컬 실행·환경 변수·게임 규칙; new or modify
  - `vibe_game/docs/game-rules.md` :: 판정·점수·하트·순위 정책; new
  - `vibe_game/docs/data-retention.md` :: 90일 raw event/최종 결과 보관; new
  - `vibe_game/docs/entra-setup.md` :: 앱 등록·redirect URI·scope; new
  - `vibe_game/docs/local-development.md` :: mock auth/Cosmos 개발 절차; new

#### Details

- README에는 `npm install`, `.env.local` 생성, `npm run dev`, test/build 명령을 포함한다.
- 게임 규칙 문서는 Perfect ±80ms, Good ±160ms, score 100/60/0, multiplier max 1.5, 5 hearts, Perfect 10 연속 회복을 정확히 명시한다.
- 문서에는 실제 client ID, tenant ID, Cosmos endpoint/key를 기록하지 않는다.
- 사용자가 실제로 게임을 플레이할 수 있는 browser support와 audio calibration 절차를 명시한다.

### I02. 최종 요구사항 checklist와 회귀 검증

- Related Files:
  - `vibe_game/docs/release-checklist.md` :: 요구사항별 검증 체크리스트; new
  - `vibe_game/e2e/release-critical-path.spec.ts` :: 최종 critical path; new

#### Details

- checklist는 다음을 각각 증거와 함께 확인한다: Entra login, playable rhythm input, Web Audio, pause/back, refresh resume, single active session, abandon confirmation, result persistence, server validation, daily/all-time leaderboard, display name, accessibility, Chrome/Edge.
- 실패 시 score가 leaderboard에 들어가지 않는 경우를 검증한다.
- 동일 사용자 여러 결과가 각각 row로 표시되는지 검증한다.
- 배포 전에 lint/typecheck/unit/E2E/build/smoke 결과를 기록한다.

## Acceptance Criteria

- [ ] 새 개발자가 README만 보고 로컬 앱을 실행할 수 있다.
- [ ] 운영자가 Entra·Cosmos·App Service 설정을 문서대로 재현할 수 있다.
- [ ] 필수 3조건인 실제 플레이, 중간저장·뒤로가기 복원, 독창적 차별화가 release checklist에서 모두 통과한다.
- [ ] Chrome과 Edge의 critical path가 통과한다.
- [ ] 비밀값·사용자 토큰·raw event가 문서나 로그에 노출되지 않는다.

## Validation

- `cd vibe_game; npm run lint`
- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- --run`
- `cd vibe_game; npm run test:e2e`
- `cd vibe_game; npm run build`
- Azure 배포 후 `npm run smoke-test -- --base-url https://<app-service-host>`

## Commit Message

```text
docs(release): document operations and verify critical path

Plan: 2026-09-21-office-rhythm-game
Phase: P04-azure-release
Task: T03-release-readiness

- Document local, Entra, Cosmos and Azure App Service operations
- Add final critical path checklist for release acceptance
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
