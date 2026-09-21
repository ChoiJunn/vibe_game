# Task: T01 Settings, Accessibility, and E2E

## Status: pending

## Goal

사용자별 음악·효과음·음소거·입력 지연 보정 설정을 제공하고, 최신 Chrome·Edge에서 로그인부터 플레이·일시정지·복원·결과·순위표까지 핵심 흐름을 E2E로 검증한다.

## Decision Summary

- 음악 볼륨·효과음 볼륨·음소거를 독립 제공한다.
- 사용자별 오디오·입력 지연 보정값을 제공한다.
- 최신 Chrome과 Edge 데스크톱을 공식 지원한다.
- 색상·모양·텍스트·애니메이션을 함께 사용한다.

## Implementation

### I01. 설정 화면과 calibration

- Related Files:
  - `vibe_game/src/components/settings/AudioSettingsPanel.tsx` :: `AudioSettingsPanel`; new
  - `vibe_game/src/components/settings/LatencyCalibration.tsx` :: `LatencyCalibration`; new
  - `vibe_game/src/client/settings/settingsStore.ts` :: settings persistence; new
  - `vibe_game/src/client/settings/settingsStore.test.ts` :: range/migration tests; new

#### Details

- musicVolume, sfxVolume은 0~1, inputOffsetMs는 명시된 안전 범위 안에서만 저장한다.
- localStorage key는 versioned namespace를 사용하고, 인증 토큰·개인정보는 저장하지 않는다.
- calibration은 visual click/beat와 space input의 차이를 측정하고 사용자에게 offset 값을 확인시킨다.
- 설정 변경은 다음 note부터 적용하고 현재 판단 중인 event를 소급 변경하지 않는다.

### I02. 접근성·키보드·브라우저 E2E

- Related Files:
  - `vibe_game/src/components/game/AccessibleGameStatus.tsx` :: live status; new
  - `vibe_game/src/styles/accessibility.css` :: focus/reduced-motion; new
  - `vibe_game/e2e/gameplay.spec.ts` :: tutorial/play/pause; new
  - `vibe_game/e2e/resume.spec.ts` :: refresh/back/resume; new
  - `vibe_game/e2e/leaderboard.spec.ts` :: result and ranking; new

#### Details

- `prefers-reduced-motion`이면 장식 animation을 줄이고 판정 텍스트는 유지한다.
- 모든 버튼과 설정 control은 키보드 focus ring을 갖는다.
- game canvas에 접근 가능한 상태 요약을 제공해 현재 section, score, hearts, judgement를 screen reader가 읽을 수 있게 한다.
- E2E는 실제 Entra secret을 저장하지 않고, 인증 provider 경계에서 테스트 계정을 주입한다.

## Acceptance Criteria

- [ ] 음악·효과음·음소거·offset 설정이 새로고침 후 유지된다.
- [ ] Chrome과 Edge에서 탭·홀드·pause·resume이 동작한다.
- [ ] reduced motion, keyboard focus, 비색상 판정 표시를 확인할 수 있다.
- [ ] 로그인 → 튜토리얼 → 플레이 → 뒤로가기 pause → refresh resume → 결과 → leaderboard 흐름이 E2E로 통과한다.

## Validation

- `cd vibe_game; npm run lint`
- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/client/settings src/components --run`
- `cd vibe_game; npm run test:e2e -- --project=chromium`
- Edge에서 동일 E2E 시나리오를 수동 확인

## Commit Message

```text
feat(ux): add audio calibration accessibility and e2e coverage

Plan: 2026-09-21-office-rhythm-game
Phase: P04-azure-release
Task: T01-settings-accessibility-e2e

- Add per-user audio and latency settings
- Cover gameplay resume and leaderboard flows with accessible UI tests
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
