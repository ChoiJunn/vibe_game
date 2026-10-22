# Task: T02 Refresh Public Home Entry

## Status: done

## Goal
Make `/` read as a compact rhythm-game start screen, featuring the shared animated preview and a primary action that takes guests to Entra sign-in and authenticated users to `/game`.

## Decision Summary
- Preserve the existing Entra redirect flow and use `AuthContextValue.status` to select the home action.
- Keep scene preview decorative; do not fetch or create a game session from the public page.

## Implementation

### I01. Auth-aware home action
- Related Files:
  - `src/components/auth/LoginButton.tsx` :: `LoginButton` — render login/loading/error/authenticated states; modify.
  - `src/auth/useAuth.ts` :: `useAuth` — existing context access; read-only.
  - `src/auth/AuthProvider.tsx` :: `signIn` and `AuthStatus` handling — preserve behavior; read-only.

#### Details
- **Signature**: retain `export function LoginButton(): JSX.Element` to avoid changing the only current caller (`src/app/page.tsx`).
- **State model**: consume `status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'`, `errorMessage`, and `signIn` from `useAuth()`.
- **Execution flow / logic**:
  1. On `authenticated`, render a prominent link labeled `게임 시작` targeting `/game`; do not call `signIn` again.
  2. On `unauthenticated`, render the existing Entra login action labeled `Entra ID 로그인` and invoke `signIn()` on click.
  3. On `loading`, keep a disabled login-state button with a concise loading label; do not flash the guest action as if auth were settled.
  4. On `error`, keep the current disabled configuration action and visible `errorMessage`.
  5. Preserve accessible button/link semantics and error status announcements. Do not alter redirect path or scopes in `AuthProvider`.

### I02. Public start-screen composition
- Related Files:
  - `src/app/page.tsx` :: `HomePage` — replace the oversized two-column invitation content with a rhythm-first start screen; modify.
  - `src/app/globals.css` :: `.page-shell--home`, `.landing-stage`, `.landing-content`, `.landing-stats` — compact full-bleed responsive home layout; modify.
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` — render the shared decorative scene; read-only from T01.
  - `e2e/auth-shell.spec.ts` :: landing CTA accessible name — keep the existing landing smoke assertion aligned with the chosen visible label; modify.
  - `e2e/health.spec.ts` :: home entry smoke assertion — keep its guest CTA assertion aligned with the visible label; modify.

#### Details
- Keep the existing `/` route as a Server Component; it must not read auth state directly or add `use client`.
- Render a single concise Korean title, one-line game/control explanation, the `LoginButton`, and existing game stats as compact chips. Use the shared preview as the main stage art.
- Keep the top-bar navigation provided by `AppShell`; remove redundant copy, the faux browser-window controls, and hidden/dead floating office cards from the home composition.
- Use fluid `min-height: calc(100dvh - 4rem)` or equivalent to fill below the existing 4rem top bar; reduce current `4vw` outer padding and 1240px framed-card constraint so the art and action occupy the viewport with little unused background.
- Keep desktop content legible beside/over the stage and stack it at tablet/mobile breakpoints without hiding the animated art or primary action. Use compact heading sizes and avoid fixed heights that clip localized text.
- Do not add a session API call, game-start POST, autoplay sound, or user-specific data to the public page.

## Acceptance Criteria
- [ ] Guest home shows `Entra ID 로그인`; authenticated home shows a `게임 시작` link to `/game`.
- [ ] Auth loading and configuration error states remain understandable and accessible.
- [ ] Home fills the viewport below the top bar with compact text and visible animated stage on mobile and desktop.
- [ ] Visiting/rendering `/` makes no `/api/game/session` POST and starts no audio.

## Validation
- `npm run lint` — passes for home/action changes.
- `npm run typecheck` — passes without converting `HomePage` into a client component.
- `npm run test:e2e -- --grep "landing screen|protected route"` — current landing/auth-shell coverage passes after expected labels/layout assertions are updated in T04.

## Commit Message
```text
feat(home): make the landing page a rhythm game start screen

Plan: 2026-10-22-rhythm-game-intro-screen
Phase: P01-rhythm-game-intro-screen
Task: T02-refresh-home-entry

- Adapt the primary home action to Entra auth state
- Replace oversized hero whitespace with the shared stage preview
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 1861b1f
