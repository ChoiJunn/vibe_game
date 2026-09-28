# Phase: P01 검증 저장 및 새 게임 복구

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 탭 keyup이 다음 버스트에 잘못 합산되어 replay 상태가 갈라지는 결함 수정 | [T01](./T01-repair-verified-input-sequence.md) |
| T02 | `in_progress` | 저장되지 않은 최신 결과와 입력 이벤트를 사용자별 브라우저에 24시간 임시 보관 | [T02](./T02-retain-unsaved-result-24h.md) |
| T03 | `pending` | 결과 저장 실패 뒤 기존 세션을 안전히 종료하고 새 게임으로 이동하는 UI/API 복구 | [T03](./T03-unblock-safe-new-game.md) |

## Progress

- done: 1/3 (active: T02)
