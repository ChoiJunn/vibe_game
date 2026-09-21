# Task: T03 Phaser Office Scene

## Status: done

## Goal

Phaser로 출근부터 퇴근까지의 2D 사무실 장면을 렌더링하고, 중앙 타이밍 게이지·업무 아이콘·캐릭터 동작·하트·콤보·판정 피드백을 실제 플레이 상태와 연결한다.

## Decision Summary

- 2D 일러스트 스타일과 16:9 viewport를 사용한다.
- 업무 아이콘과 캐릭터 동작을 함께 보여준다.
- 색상·모양·텍스트·애니메이션을 함께 사용한다.

## Implementation

### I01. Phaser 게임 인스턴스

- Related Files:
  - `vibe_game/src/game/PhaserGame.ts` :: `createPhaserGame`; new
  - `vibe_game/src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas`; new
  - `vibe_game/src/game/scenes/OfficeRhythmScene.ts` :: `OfficeRhythmScene`; new
  - `vibe_game/src/game/scenes/BootScene.ts` :: `BootScene`; new

#### Details

- Phaser canvas는 `PhaserCanvas` client component에서만 생성·destroy한다.
- React가 소유하는 상태는 session boundary로 제한하고, 프레임 단위 렌더 상태는 Phaser scene이 관리한다.
- `ResizeObserver`로 16:9 viewport 내부에 scale mode를 적용한다.
- unmount 시 Phaser instance를 반드시 destroy해 중복 오디오·키보드 listener를 방지한다.

### I02. 업무 구간·HUD·피드백

- Related Files:
  - `vibe_game/src/game/scenes/office/OfficeBackground.ts` :: section별 배경; new
  - `vibe_game/src/game/scenes/office/OfficeCharacter.ts` :: 캐릭터 상태 애니메이션; new
  - `vibe_game/src/game/scenes/office/TimingGauge.ts` :: 중앙 게이지; new
  - `vibe_game/src/game/scenes/office/WorkIconPrompt.ts` :: 업무 아이콘; new
  - `vibe_game/src/game/scenes/office/GameHud.ts` :: hearts, combo, score, section; new
  - `vibe_game/src/game/scenes/office/JudgementFeedback.ts` :: Perfect/Good/Miss 피드백; new

#### Details

- section ID에 따라 출근, 키보드, 메일, 회의, 복사, 퇴근 배경·아이콘을 전환한다.
- timing gauge는 current song position과 event start/end를 같은 시간축에서 렌더링한다.
- Perfect/Good/Miss는 서로 다른 색상뿐 아니라 텍스트·아이콘·scale/flash animation을 함께 사용한다.
- HUD에는 현재 점수, combo, multiplier, hearts(현재/최대), 남은 곡 진행률을 표시한다.

### I03. 게임 컨트롤러 연결

- Related Files:
  - `vibe_game/src/game/RhythmGameController.ts` :: `RhythmGameController`; new
  - `vibe_game/src/game/RhythmGameController.test.ts` :: clock·state·scene event 연결; new

#### Details

- `RhythmGameController`는 `AudioClock`, `SpaceInputController`, `reduceRunState`, Phaser scene adapter를 주입받는다.
- controller는 입력을 judge 함수에 전달하고 결과를 state reducer에 적용한 뒤 scene/HUD에 이벤트를 발행한다.
- score·combo·hearts의 source of truth는 reducer state이며 Phaser sprite는 표시만 담당한다.

## Acceptance Criteria

- [ ] 최신 Chrome·Edge에서 Phaser 장면이 16:9 영역에 렌더링된다.
- [ ] 6개 업무 구간이 beatmap section에 맞춰 전환된다.
- [ ] 스페이스바 입력 시 게이지·아이콘·캐릭터·HUD·판정 피드백이 같은 event를 반영한다.
- [ ] React route 이동 후 Phaser instance와 listener가 정리된다.
- [ ] 색상 없이도 텍스트와 아이콘으로 판정을 구분할 수 있다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/game/RhythmGameController.test.ts --run`
- `cd vibe_game; npm run build`
- `cd vibe_game; npm run dev`에서 2~3분 곡 전체를 플레이하고 section/HUD를 수동 확인

## Commit Message

```text
feat(gameplay): render office rhythm phaser scene

Plan: 2026-09-21-office-rhythm-game
Phase: P02-rhythm-gameplay
Task: T03-phaser-office-scene

- Add responsive Phaser office scene and timing HUD
- Connect beatmap events to character, icons and judgement feedback
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
