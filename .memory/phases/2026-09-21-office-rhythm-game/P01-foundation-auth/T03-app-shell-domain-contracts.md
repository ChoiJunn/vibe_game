# Task: T03 App Shell and Domain Contracts

## Status: pending

## Goal

소개·게임·순위표 화면의 공통 셸과 이후 Phase가 공유할 리듬게임 도메인 타입을 확정한다. 실제 게임 플레이, Cosmos 연동, 서버 API 구현은 이 Task에서 하지 않는다.

## Decision Summary

- 2D 유쾌한 사무실 일러스트와 16:9 반응형 게임 셸을 사용한다.
- 첫 곡은 출근 → 키보드 → 메일 → 회의 → 복사·문서 → 퇴근 순서다.
- 곡 1개, 110 BPM, 4/4, 8마디 단위 구간, 고정 JSON beatmap을 사용한다.

## Implementation

### I01. 공통 레이아웃과 화면 상태

- Related Files:
  - `vibe_game/src/components/layout/AppShell.tsx` :: `AppShell`; new
  - `vibe_game/src/components/layout/TopBar.tsx` :: `TopBar`; new
  - `vibe_game/src/components/game/GameViewport.tsx` :: `GameViewport`; new
  - `vibe_game/src/components/ui/StatusMessage.tsx` :: `StatusMessage`; new
  - `vibe_game/src/styles/tokens.css` :: 색상·간격·타이포 토큰; new

#### Details

- 게임 viewport는 `aspect-ratio: 16 / 9`, `max-width: 1280px`, `width: min(100%, 1280px)` 기준으로 한다.
- viewport 바깥에는 로그인 사용자 표시 이름, 로그아웃, 게임/순위표 이동을 제공한다.
- 색상만으로 상태를 전달하지 않고 텍스트·아이콘·모양을 병행할 수 있는 토큰을 정의한다.

### I02. 공유 도메인 타입 및 beatmap 계약

- Related Files:
  - `vibe_game/src/domain/rhythm.ts` :: `NoteType`, `Judgement`, `Beatmap`, `RhythmEvent`, `RunState`; new
  - `vibe_game/src/domain/score.ts` :: `ScoreBreakdown`, `ScoreResult`; new
  - `vibe_game/src/content/beatmaps/office-day-01.json` :: 첫 곡 데이터; new
  - `vibe_game/src/content/beatmaps/beatmap.schema.json` :: JSON Schema; new

#### Details

- 타입 계약은 다음 필드를 포함한다.

  ```typescript
  type NoteType = 'tap' | 'hold';
  type Judgement = 'perfect' | 'good' | 'miss';

  type RhythmEvent = {
    id: string;
    type: NoteType;
    startMs: number;
    endMs?: number;
    section: 'arrival' | 'keyboard' | 'mail' | 'meeting' | 'copy' | 'departure';
  };

  type Beatmap = {
    id: 'office-day-01';
    bpm: 110;
    timeSignature: [4, 4];
    events: RhythmEvent[];
    sections: Array<{ id: RhythmEvent['section']; startMs: number; endMs: number }>;
  };

  type RunState = {
    runId: string;
    userOid: string;
    beatmapId: string;
    status: 'active' | 'paused' | 'completed' | 'failed' | 'abandoned';
    cursorMs: number;
    nextEventIndex: number;
    hearts: number;
    combo: number;
    consecutivePerfects: number;
    score: number;
    perfectCount: number;
    goodCount: number;
    missCount: number;
    updatedAt: string;
  };
  ```

- `startMs`는 곡 시작 기준 정수 milliseconds이며, hold만 `endMs`를 갖는다.
- beatmap은 110 BPM의 4/4 박자와 8마디 단위 section 경계를 검증한다.

### I03. 셸·타입 단위 테스트

- Related Files:
  - `vibe_game/src/domain/rhythm.test.ts` :: beatmap 구조 검증; new
  - `vibe_game/src/domain/score.test.ts` :: 기본 score 타입 불변식; new
  - `vibe_game/src/content/beatmaps/office-day-01.test.ts` :: 첫 곡 데이터 검증; new

#### Details

- 이벤트 ID 중복, 음수 시간, hold의 `endMs <= startMs`, section 밖 이벤트를 실패로 처리한다.
- 모든 이벤트는 곡 종료 시각 이내에 있어야 한다.
- 한 곡의 section 순서와 BPM·박자를 고정 검증한다.

## Acceptance Criteria

- [ ] 소개·게임·순위표가 공통 AppShell 안에서 같은 16:9 규칙을 사용한다.
- [ ] 첫 곡 JSON이 스키마 검증을 통과한다.
- [ ] Phase 2~3이 사용할 `Beatmap`, `RhythmEvent`, `RunState`, `ScoreResult` 타입이 존재한다.
- [ ] 접근성 상태 표현이 색상 단독 의존 없이 확장 가능하다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/domain src/content/beatmaps --run`
- `cd vibe_game; npm run build`

## Commit Message

```text
feat(shell): define rhythm app shell and domain contracts

Plan: 2026-09-21-office-rhythm-game
Phase: P01-foundation-auth
Task: T03-app-shell-domain-contracts

- Add responsive app shell and accessibility tokens
- Add beatmap and run state contracts for gameplay phases
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
