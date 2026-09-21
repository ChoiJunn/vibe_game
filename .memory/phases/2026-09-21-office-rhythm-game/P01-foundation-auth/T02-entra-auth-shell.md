# Task: T02 Entra Auth Shell

## Status: done

## Goal

단일 Entra ID 테넌트의 모든 일반 사용자가 MSAL로 로그인하고, 로그인 전에는 소개 화면을 보며 로그인 후에만 게임·순위표에 접근하도록 인증 셸을 구축한다. 사용자 식별자는 `oid`, 표시 이름은 `displayName`을 사용한다.

## Decision Summary

- Microsoft 공식 MSAL 기반 인증을 사용한다.
- 요청 권한은 `openid`, `profile`, `email` 수준으로 제한한다.
- `NEXT_PUBLIC_ENTRA_TENANT_ID`로 single-tenant authority를 구성한다.
- 로그아웃 후에는 소개 화면으로 돌아간다.

## Implementation

### I01. 인증 설정과 세션 인터페이스

- Related Files:
  - `vibe_game/src/auth/config.ts` :: `entraAuthConfig`; new
  - `vibe_game/src/auth/types.ts` :: `AuthenticatedUser`, `AuthStatus`; new
  - `vibe_game/src/auth/msalClient.ts` :: `createMsalClient()`; new
  - `vibe_game/src/auth/AuthProvider.tsx` :: `AuthProvider`; new
  - `vibe_game/src/auth/useAuth.ts` :: `useAuth()`; new

#### Details

- 계약은 다음 형태를 따른다.

  ```typescript
  type AuthenticatedUser = {
    oid: string;
    displayName: string;
    email?: string;
    tenantId: string;
  };

  type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

  type AuthContextValue = {
    status: AuthStatus;
    user: AuthenticatedUser | null;
    signIn(): Promise<void>;
    signOut(): Promise<void>;
  };
  ```

- authority는 `https://login.microsoftonline.com/{tenantId}`로 고정하고, `common`·`organizations` authority를 사용하지 않는다.
- `oid`와 `tenantId`가 없는 토큰은 인증 성공으로 취급하지 않는다.
- display name이 비어 있으면 email local-part가 아니라 안전한 `사용자` fallback을 사용한다.
- 토큰 원문과 access token을 React 상태나 Cosmos 문서에 저장하지 않는다.

### I02. 보호 라우트 및 소개 화면 연결

- Related Files:
  - `vibe_game/src/app/page.tsx` :: `LandingPage`; modify
  - `vibe_game/src/app/game/page.tsx` :: `GamePage`; new
  - `vibe_game/src/app/leaderboard/page.tsx` :: `LeaderboardPage`; new
  - `vibe_game/src/components/auth/RequireAuth.tsx` :: `RequireAuth`; new
  - `vibe_game/src/components/auth/LoginButton.tsx` :: `LoginButton`; new

#### Details

- 비로그인 사용자는 `/`에서 게임 소개와 로그인 버튼을 본다.
- `/game`, `/leaderboard`는 `loading` 중에는 인증 로딩 UI, `unauthenticated`면 `/`로 이동 또는 로그인 CTA, `authenticated`면 children을 렌더링한다.
- 인증 오류는 토큰·내부 오류를 노출하지 않고 재로그인 안내를 표시한다.
- 표시 이름은 헤더와 결과 화면에만 사용하며, 내부 API 호출에는 항상 `oid` 기반 세션을 사용한다.

### I03. 인증 단위·E2E 경계 테스트

- Related Files:
  - `vibe_game/src/auth/msalClient.test.ts` :: authority와 scope 검증; new
  - `vibe_game/src/auth/AuthProvider.test.tsx` :: 상태 전이 검증; new
  - `vibe_game/e2e/auth-shell.spec.ts` :: 로그인 전 보호 화면 smoke test; new

#### Details

- tenant ID가 없거나 placeholder이면 앱이 조용히 인증을 시도하지 않고 설정 오류 UI를 보여준다.
- 로그인 성공, 로그아웃, 토큰 계정 없음, 인증 오류 상태를 각각 검증한다.
- 실제 Entra credentials는 테스트 코드와 저장소에 넣지 않는다.

## Acceptance Criteria

- [ ] single-tenant authority와 최소 scope가 적용된다.
- [ ] 비로그인 사용자는 소개 화면을 보고 로그인할 수 있다.
- [ ] 로그인 사용자는 `/game`과 `/leaderboard`에 접근할 수 있다.
- [ ] 사용자 식별자는 `oid`, 화면 표시 이름은 `displayName`으로 분리된다.
- [ ] 토큰과 비밀값이 로그·클라이언트 저장소·Cosmos 문서에 저장되지 않는다.

## Validation

- `cd vibe_game; npm run lint`
- `cd vibe_game; npm run typecheck`
- `cd vibe_game; npm test -- src/auth --run`
- `cd vibe_game; npm run build`
- 등록된 개발용 Entra 앱에서 실제 로그인 후 `/game`과 로그아웃 흐름을 수동 확인

## Commit Message

```text
feat(auth): add single tenant entra login shell

Plan: 2026-09-21-office-rhythm-game
Phase: P01-foundation-auth
Task: T02-entra-auth-shell

- Add MSAL single-tenant authentication context
- Protect game and leaderboard routes
```

## Progress

- Automated validation passed. Real Entra redirect requires local/production app registration environment variables.

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
