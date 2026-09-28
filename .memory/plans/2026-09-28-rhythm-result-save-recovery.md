# Plan: 리듬 결과 저장 복구 및 새 게임 전환

## Goal

운영 게임에서 발생한 `422 invalid_sequence`의 입력 기록 불일치를 재현하고 수정한다. 서버 재생 검증을 통과하지 못한 점수는 순위표에 저장하지 않으며, 실패한 최신 1건만 사용자별 브라우저에 24시간 보관한다. 저장 요청이 실패해도 기존 활성 세션을 안전하게 정리할 수 있으면 결과창에서 새 게임을 시작할 수 있도록 한다.

## Decision Source

- [확정 결정](../decisions/2026-09-28-rhythm-result-save-recovery.md)
- 순위표에는 서버 검증을 통과한 결과만 저장한다.
- 검증/전송 실패 결과는 사용자별 최신 1건만 브라우저에 24시간 임시 보관하며, 인증 토큰은 저장하지 않는다.
- 실패 결과를 저장 완료로 표시하지 않는다. 저장 실패만으로 새 게임을 막지 않으며, 새 게임 전 이전 활성 세션을 안전하게 종료한다.
- 서버 검증 규칙을 완화하지 않고 입력 기록 생성·저장·재생 사이의 불일치를 수정한다.

## Repository Context

- Repository: `C:\바이브교육\vibe_game`
- Terminal result submission: `src/components/game/PhaserCanvas.tsx` → `SessionApiClient.submitResult()` → `/api/game/results` → `src/server/game/resultService.ts` → `validateRun()` / `replayInputEvents()`.
- Input event stream: `src/game/input/SpaceInputController.ts`; autosave batching/flush: `src/game/persistence/AutosaveCoordinator.ts`; game transitions and terminal freeze: `src/game/RhythmGameController.ts`.
- Existing relevant tests: `src/game/input/SpaceInputController.test.ts`, `src/game/persistence/AutosaveCoordinator.test.ts`, `src/game/RhythmGameController.test.ts`, `src/server/game/verifiedReplay.test.ts`, `src/server/game/validateRun.test.ts`, `src/server/game/resultService.test.ts`, `src/server/game/sessionService.test.ts`, `src/components/results/ResultSummary.test.tsx`, `e2e/release-critical-path.spec.ts`, and `e2e/support/gameApi.ts`.
- Production App Service application file-system logs were observed as disabled during diagnosis. Do not depend on those logs as the only regression proof; deterministic tests must expose which invariant failed.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 입력 이벤트 재생 검증을 바로잡고, 미저장 결과의 24시간 복구와 저장 실패 후 새 게임 전환을 완성 | [P01](../phases/2026-09-28-rhythm-result-save-recovery/P01-verified-save-and-new-game/phase.md) |

## Scope and Constraints

- 본 계획은 위 결정 문서의 다섯 항목만 다룬다. Entra 로그인, Cosmos 권한/스키마, 게임 난이도, 아트 자산, 배포 파이프라인은 변경하지 않는다.
- Cosmos DB에 기록하기 전 서버의 고정 beatmap 재생 검증을 계속 수행한다. `claimedSnapshot`이나 클라이언트 점수를 검증 없이 순위표에 쓰지 않는다.
- 로컬 임시 기록에는 Entra access/ID token, Authorization 헤더, Cosmos 자격 증명을 넣지 않는다.
- 새 게임은 이전 run의 active lock이 해제된 뒤 시작한다. 세션 종료가 실패하면 화면을 떠나거나 다른 세션을 임의로 종료하지 말고, 재시도 가능한 오류를 표시한다.
- 기존 `.memory/current.md`가 가리키던 2026-09-22 아트 Task는 이 계획에 편입하지 않는다. 해당 문서와 상태를 수정하지 않고, 새 계획 실행 포인터만 본 계획으로 이동한다.
