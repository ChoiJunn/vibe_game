# Plan: 사내 업무 리듬 매니저 게임

## Goal

특정 조직의 Microsoft Entra ID 사용자가 데스크톱 웹에서 플레이할 수 있는 오리지널 리듬게임을 구축한다. 플레이어는 출근부터 퇴근까지의 사무실 업무를 110 BPM 리듬에 맞춰 처리하고, Perfect/Good/Miss 판정·콤보·하트·점수 경쟁을 경험한다. 게임 진행은 Cosmos DB에 자동 저장하며 브라우저 뒤로가기·새로고침·탭 전환 후 정확한 시점에서 재개할 수 있어야 한다. 모든 플레이 결과는 서버 검증 후 오늘의 순위와 전체 순위에 표시한다.

## Repository

- Local path: `vibe_game/`
- Remote: `https://github.com/ChoiJunn/vibe_game.git`
- Current state: empty repository, `main` branch has no commit
- Plan artifacts: repository parent workspace의 `.memory/`

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 빈 레포에 Next.js·TypeScript·Phaser 기반과 단일 테넌트 Entra 로그인 골격 구축 | [P01](../phases/2026-09-21-office-rhythm-game/P01-foundation-auth/phase.md) |
| P02 | `pending` | 고정 beatmap, Web Audio 리듬 시계, 판정·콤보·하트·2D 플레이 화면 구현 | [P02](../phases/2026-09-21-office-rhythm-game/P02-rhythm-gameplay/phase.md) |
| P03 | `pending` | Cosmos DB 진행 세션·결과 저장, 서버 검증, 오늘/전체 순위표 구현 | [P03](../phases/2026-09-21-office-rhythm-game/P03-persistence-competition/phase.md) |
| P04 | `pending` | 오디오 보정·접근성·통합 검증과 Azure App Service 배포 기반 완성 | [P04](../phases/2026-09-21-office-rhythm-game/P04-azure-release/phase.md) |

## Cross-Phase Constraints

- 구현 대상은 `vibe_game/` 내부로 한정한다. `.memory/`에는 계획 산출물만 둔다.
- 리듬세상의 음악·캐릭터·스테이지·연출·패턴을 복제하지 않고, 사무실 업무 소재의 독창적인 2D 리듬게임으로 구현한다.
- 공식 지원 환경은 최신 Chrome·Microsoft Edge 데스크톱이며, 16:9 기준 반응형 레이아웃을 사용한다.
- 로그인 사용자 식별자는 Entra ID `oid`를 사용하고, 화면 표시에는 Entra `displayName`을 사용한다.
- 점수는 클라이언트 최종값을 신뢰하지 않는다. 고정 beatmap과 입력 이벤트를 서버에서 검증한 뒤 결과를 저장한다.
- 진행 세션은 사용자당 하나만 존재한다. 진행 중 상태와 완료 결과는 서로 다른 Cosmos DB 문서 유형으로 관리한다.
- 원본 입력 이벤트는 90일 보관 후 삭제하고, 최종 순위 기록은 계속 보관한다.
