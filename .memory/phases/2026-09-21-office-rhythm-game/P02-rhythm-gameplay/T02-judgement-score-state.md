# Task: T02 Judgement, Score, and State

## Status: done

## Goal

고정 beatmap의 tap/hold 입력을 Perfect ±80ms, Good ±160ms, Miss 기준으로 판정하고, 100/60/0 점수·콤보 배율·하트·Perfect 연속 회복을 결정론적 상태머신으로 구현한다.

## Decision Summary

- 탭과 홀드 모두 스페이스바를 사용한다.
- 홀드는 시작과 종료를 각각 판정한다.
- Good은 일반 콤보를 유지하지만 Perfect 연속에는 포함하지 않는다.
- Miss는 하트를 1개 감소시키고 콤보·Perfect 연속을 초기화한다.

## Implementation

### I01. 판정 함수

- Related Files:
  - `vibe_game/src/game/judgement/judgeInput.ts` :: `judgeTap`, `judgeHoldStart`, `judgeHoldEnd`; new
  - `vibe_game/src/game/judgement/types.ts` :: `JudgementWindow`, `InputEvent`, `JudgementResult`; new
  - `vibe_game/src/game/judgement/judgeInput.test.ts` :: 경계값 테스트; new

#### Details

```typescript
const JUDGEMENT_WINDOWS = {
  perfectMs: 80,
  goodMs: 160,
} as const;

type InputEvent = {
  type: 'keydown' | 'keyup';
  songPositionMs: number;
};

type JudgementResult = {
  judgement: 'perfect' | 'good' | 'miss';
  errorMs: number;
  eventId: string;
};
```

- offset은 `inputOffsetMs`를 song position에 반영한 뒤 판정한다.
- Perfect는 `abs(errorMs) <= 80`, Good은 `80 < abs(errorMs) <= 160`, 나머지는 Miss다.
- hold는 start와 end를 각각 독립 판정하고, 둘 중 하나라도 Miss면 해당 note 결과는 Miss다.
- 한 note에 동일 keydown/keyup을 중복 적용하지 않는다.

### I02. 점수·콤보·하트 상태 전이

- Related Files:
  - `vibe_game/src/game/state/reduceRunState.ts` :: `reduceRunState`; new
  - `vibe_game/src/game/state/scorePolicy.ts` :: `calculateJudgementScore`, `getComboMultiplier`; new
  - `vibe_game/src/game/state/reduceRunState.test.ts` :: 상태 전이 테스트; new

#### Details

- 기본점수는 Perfect 100, Good 60, Miss 0이다.
- 10콤보마다 `0.1` 배율을 더하고 최대 `1.5`다. 점수 합산 시 현재 배율을 적용한다.
- Good은 combo를 증가시키지만 `consecutivePerfects`를 0으로 만든다.
- Perfect는 combo와 `consecutivePerfects`를 증가시키며 10회 연속이면 hearts를 1 증가시키되 5를 넘지 않는다.
- Miss는 hearts를 1 감소시키고 combo와 `consecutivePerfects`를 0으로 만든다. hearts가 0이면 `failed`로 전환한다.
- 마지막 event 처리 후 곡 종료 시각에 도달하면 `completed`로 전환한다.

### I03. 입력 수집 경계

- Related Files:
  - `vibe_game/src/game/input/SpaceInputController.ts` :: `SpaceInputController`; new
  - `vibe_game/src/game/input/SpaceInputController.test.ts` :: key repeat·blur 테스트; new

#### Details

- `event.code === 'Space'`만 처리하고 `event.repeat === true` keydown은 무시한다.
- 게임이 `playing`이 아닐 때는 입력을 도메인 엔진으로 전달하지 않는다.
- `preventDefault()`로 스페이스바의 페이지 스크롤을 막되, 게임 viewport가 focus 상태일 때만 적용한다.
- window blur는 gameplay controller에 pause 요청을 전달한다.

## Acceptance Criteria

- [ ] Perfect/Good 경계값이 ±80ms·±160ms에서 정확히 동작한다.
- [ ] 탭과 홀드의 시작·종료 판정이 중복 없이 처리된다.
- [ ] score, combo, multiplier, hearts, consecutivePerfects 상태 전이가 결정론적이다.
- [ ] Perfect 10회 연속 시 하트가 회복되고 최대 5를 넘지 않는다.
- [ ] Miss로 하트가 0이 되면 `failed` 상태가 된다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/game/judgement src/game/state src/game/input --run`
- `cd vibe_game; npm run build`

## Commit Message

```text
feat(gameplay): implement rhythm judgement and score state

Plan: 2026-09-21-office-rhythm-game
Phase: P02-rhythm-gameplay
Task: T02-judgement-score-state

- Add tap and hold judgement windows
- Add combo multiplier, hearts and deterministic score transitions
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
