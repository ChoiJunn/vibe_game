# Task: T01 Audio Beatmap Clock

## Status: done

## Goal

Web Audio API의 `AudioContext.currentTime`를 기준으로 110 BPM 업무 리듬과 고정 beatmap을 함께 재생하고, Phaser와 판정 엔진이 공유할 수 있는 단조 증가 게임 시계를 제공한다.

## Decision Summary

- 음악은 Web Audio API로 생성하는 오리지널 비트·업무 효과음 루프다.
- 110 BPM, 4/4, 8마디 단위 section, 고정 JSON beatmap이다.
- 브라우저 오디오 지연 보정값은 나중에 설정 화면에서 적용하되 clock이 보정 offset을 받을 수 있어야 한다.

## Implementation

### I01. 오디오 시계 인터페이스

- Related Files:
  - `vibe_game/src/game/audio/AudioClock.ts` :: `AudioClock`; new
  - `vibe_game/src/game/audio/types.ts` :: `AudioClockState`, `AudioSettings`; new

#### Details

```typescript
type AudioClockState = 'idle' | 'countdown' | 'playing' | 'paused' | 'ended';

type AudioSettings = {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  inputOffsetMs: number;
};

interface AudioClock {
  load(beatmap: Beatmap, settings: AudioSettings): Promise<void>;
  start(atSongMs?: number): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  getSongPositionMs(): number;
  getState(): AudioClockState;
  setSettings(settings: AudioSettings): void;
  subscribe(listener: (state: AudioClockState) => void): () => void;
}
```

- `currentTime`와 `performance.now()`를 혼합해 판정 기준을 만들지 말고, 단일 clock 변환을 사용한다.
- pause 시 audio source를 정지하고 song position을 보존한다.
- resume 시 저장된 song position부터 재스케줄링한다.
- 시작 전 사용자 gesture가 없으면 `AudioContext.resume()` 실패를 사용자 안내로 처리한다.

### I02. 오리지널 업무 음향 스케줄러

- Related Files:
  - `vibe_game/src/game/audio/OfficeSoundScheduler.ts` :: `OfficeSoundScheduler`; new
  - `vibe_game/src/game/audio/instruments.ts` :: 비트·효과음 생성기; new
  - `vibe_game/src/game/audio/OfficeSoundScheduler.test.ts` :: 스케줄 검증; new

#### Details

- 출근·키보드·메일·회의·복사·퇴근 section마다 서로 다른 oscillator/noise/envelope 조합을 사용한다.
- 실제 상용 음원이나 기존 게임 음원을 사용하지 않는다.
- 스케줄러는 `AudioClock`이 제공하는 song position을 기준으로 beat 이벤트를 예약하며 UI 프레임 속도에 의존하지 않는다.
- volume은 music/SFX를 분리하고 `muted`는 두 채널을 모두 음소거한다.

## Acceptance Criteria

- [ ] 110 BPM 고정 beatmap이 오디오 clock과 동일한 song position을 사용한다.
- [ ] pause/resume에서 audio position이 리셋되지 않는다.
- [ ] 음악과 효과음 음량을 독립 조절할 수 있다.
- [ ] 사용자 gesture 이전의 AudioContext 오류가 무한 재시도 없이 안내된다.
- [ ] 오디오 생성 코드에 외부 음원 의존성이 없다.

## Validation

- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/game/audio --run`
- `cd vibe_game; npm run build`
- 최신 Chrome과 Edge에서 개발 서버를 열어 30초 재생·일시정지·재개를 수동 확인

## Commit Message

```text
feat(gameplay): add web audio beatmap clock

Plan: 2026-09-21-office-rhythm-game
Phase: P02-rhythm-gameplay
Task: T01-audio-beatmap-clock

- Add monotonic Web Audio song clock
- Schedule original office sound sections from fixed beatmap
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: 626e3ef
