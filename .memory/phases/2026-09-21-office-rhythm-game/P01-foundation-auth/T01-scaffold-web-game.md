# Task: T01 Scaffold Web Game

## Status: done

## Goal

빈 `vibe_game/` 저장소에 Next.js App Router, TypeScript, Phaser, Vitest, Playwright, ESLint, Prettier를 설치하고 로컬 개발·검증이 재현 가능한 기본 구조를 만든다. 이 Task에서는 게임 기능이나 인증 로직을 구현하지 않는다.

## Decision Summary

- Next.js + React + TypeScript를 웹 셸로 사용한다.
- Phaser를 실제 플레이 캔버스의 기반으로 사용한다.
- 공식 지원은 최신 Chrome·Microsoft Edge 데스크톱이며 16:9 기준 반응형으로 설계한다.
- 코드와 테스트는 `vibe_game/` 내부에만 생성한다.

## Implementation

### I01. 프로젝트 및 패키지 기반 생성

- Related Files:
  - `vibe_game/package.json` :: scripts와 의존성 정의; new
  - `vibe_game/tsconfig.json` :: strict TypeScript 설정; new
  - `vibe_game/next.config.ts` :: Next.js 기본 설정; new
  - `vibe_game/src/app/layout.tsx` :: 전역 HTML 셸; new
  - `vibe_game/src/app/page.tsx` :: 임시 홈 화면; new
  - `vibe_game/src/app/globals.css` :: 기본 reset와 16:9 게임 컨테이너 스타일; new
  - `vibe_game/src/game/` :: Phaser 모듈 루트; new

#### Details

- Node.js LTS와 npm을 기준으로 한다.
- `strict: true`, path alias `@/* -> src/*`를 사용한다.
- `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e` 스크립트를 제공한다.
- Phaser는 브라우저 전용 모듈이므로 서버 컴포넌트에서 직접 import하지 않는다. 게임 컴포넌트는 client boundary를 갖는다.
- `.env.example`에는 값이 아닌 변수명만 기록한다: `NEXT_PUBLIC_ENTRA_CLIENT_ID`, `NEXT_PUBLIC_ENTRA_TENANT_ID`, `NEXT_PUBLIC_ENTRA_REDIRECT_URI`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_KEY`.

### I02. 테스트·품질 기본선

- Related Files:
  - `vibe_game/vitest.config.ts` :: 단위 테스트 설정; new
  - `vibe_game/playwright.config.ts` :: Chromium 기반 E2E 설정; new
  - `vibe_game/src/**/*.test.ts` :: 도메인 테스트 위치; new
  - `vibe_game/e2e/health.spec.ts` :: 앱 부팅 smoke test; new
  - `vibe_game/.eslintrc.json` 또는 동등한 flat config :: lint 규칙; new

#### Details

- 단위 테스트 환경은 `jsdom`이 아닌 순수 도메인 로직을 우선하고, DOM 테스트가 필요한 경우에만 `jsdom`을 사용한다.
- E2E는 인증을 우회하는 개발용 테스트 플래그 또는 mock session 경계를 계획만 세우고, 실제 우회 구현은 T02에서 결정한 세션 인터페이스에 맞춘다.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`가 빈 프로젝트에서 통과해야 한다.

## Acceptance Criteria

- [ ] `vibe_game/`에서 `npm install` 후 개발 서버가 실행된다.
- [ ] `/`가 200 응답으로 열리고 16:9 게임 컨테이너의 기본 화면을 렌더링한다.
- [ ] TypeScript strict 검사, lint, 단위 테스트, production build가 통과한다.
- [ ] Phaser import가 서버 렌더링 단계에서 실행되지 않는다.
- [ ] `.env.example`에 실제 비밀값이 없다.

## Validation

- `cd vibe_game; npm install`
- `cd vibe_game; npm run lint`
- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- --run`
- `cd vibe_game; npm run build`
- `cd vibe_game; npm run dev` 후 `npm run test:e2e`

## Commit Message

```text
chore(foundation): scaffold nextjs phaser rhythm game

Plan: 2026-09-21-office-rhythm-game
Phase: P01-foundation-auth
Task: T01-scaffold-web-game

- Add Next.js TypeScript application skeleton
- Add Phaser, Vitest, Playwright and shared environment template
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
