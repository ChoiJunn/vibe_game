# Task: T04 Pause, Tutorial, and Results

## Status: done

## Goal

튜토리얼, 수동·자동 일시정지, 게임 종료 요약 화면을 구현해 사용자가 리듬게임을 학습하고 브라우저 환경 변화에도 진행을 잃지 않도록 한다. Cosmos 저장 API 호출은 P03에서 연결할 수 있도록 adapter 경계만 둔다.

## Decision Summary

- 첫 진입 시 30초 이내 인터랙티브 튜토리얼을 제공한다.
- pause 버튼과 `Esc`, 뒤로가기, 탭 전환, 창 최소화를 모두 일시정지로 처리한다.
- 정확한 곡 위치·하트·콤보·점수를 복원할 수 있는 snapshot을 만든다.

## Implementation

### I01. 튜토리얼

- Related Files:
  - `vibe_game/src/components/tutorial/TutorialOverlay.tsx` :: `TutorialOverlay`; new
  - `vibe_game/src/game/tutorial/tutorialSteps.ts` :: `tutorialSteps`; new
  - `vibe_game/src/game/tutorial/tutorialReducer.ts` :: `tutorialReducer`; new

#### Details

- 탭 1회, 홀드 시작·종료 1회, Perfect/Good/Miss 설명, 일시정지·재개를 30초 이내 단계로 제공한다.
- 튜토리얼은 실제 점수·순위 기록에 포함하지 않는다.
- 완료 여부는 사용자 브라우저 설정에만 저장하고, 서버 게임 세션과 섞지 않는다.

### I02. 일시정지 경계

- Related Files:
  - `vibe_game/src/game/pause/PauseCoordinator.ts` :: `PauseCoordinator`; new
  - `vibe_game/src/hooks/usePageLifecyclePause.ts` :: `usePageLifecyclePause`; new
  - `vibe_game/src/components/game/PauseOverlay.tsx` :: `PauseOverlay`; new

#### Details

- `Esc`, pause button, `document.visibilitychange`, `window.blur`, browser history `popstate`를 동일한 pause command로 정규화한다.
- pause 시 audio clock와 gameplay controller를 멈추고 현재 `RunState` snapshot을 만든다.
- resume은 동일한 song position에서 시작하며, pause overlay가 열린 동안 key input을 gameplay에 전달하지 않는다.
- browser back은 history entry를 소비하지 않고 현재 게임 route를 유지하는 방식으로 처리한다.
- 게임 포기만 명시적 확인 후 `abandoned` command를 보낸다.

### I03. 결과 화면

- Related Files:
  - `vibe_game/src/components/results/ResultSummary.tsx` :: `ResultSummary`; new
  - `vibe_game/src/components/results/RunStatusBadge.tsx` :: `RunStatusBadge`; new
  - `vibe_game/src/components/results/ResultSummary.test.tsx` :: completed/failed 표시; new

#### Details

- 완주·중도 실패·포기 상태를 구분한다.
- 점수, Perfect/Good/Miss counts, 최고 combo, 사용 시간, 완주 여부를 표시한다.
- P03의 result submission adapter가 완료되기 전에는 `pending submission` 상태를 표시하고 중복 제출을 방지한다.

## Acceptance Criteria

- [ ] 첫 사용자에게 튜토리얼이 표시되고 완료 후 본 게임에 진입한다.
- [ ] pause 버튼·Esc·뒤로가기·탭 전환·창 최소화 모두 동일하게 일시정지한다.
- [ ] resume 시 곡 위치와 상태가 초기화되지 않는다.
- [ ] completed/failed/abandoned 결과를 서로 구분해 표시한다.
- [ ] 포기 확인 없이 진행 세션이 폐기되지 않는다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/game/pause src/components/results --run`
- `cd vibe_game; npm run build`
- Playwright에서 visibility change와 뒤로가기 후 pause overlay 및 resume을 확인

## Commit Message

```text
feat(gameplay): add tutorial pause and result flows

Plan: 2026-09-21-office-rhythm-game
Phase: P02-rhythm-gameplay
Task: T04-pause-tutorial-results

- Add interactive tutorial and lifecycle pause coordination
- Add result summary states for completed and failed runs
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
