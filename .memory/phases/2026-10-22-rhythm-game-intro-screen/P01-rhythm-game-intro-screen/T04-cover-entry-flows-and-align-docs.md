# Task: T04 Cover Entry Flows and Align Local Docs

## Status: done

## Goal
Prove that the new public and authenticated start flows obey the no-write-before-click and recoverable-error decisions, and make local Cosmos authentication instructions agree with the supported configuration without exposing secrets.

## Decision Summary
- Use the existing Playwright E2E auth fixture and mocked game API; E2E tests must not contact Entra or Cosmos.
- Keep production managed identity and current runtime defaults unchanged; document valid local key and Azure CLI/managed-identity paths accurately.

## Implementation

### I01. Start-flow E2E coverage
- Related Files:
  - `e2e/auth-shell.spec.ts` :: landing-page and protected-route tests — update labels and assert public start affordances; modify.
  - `e2e/game-entry.spec.ts` :: entry discovery/start/retry scenarios — new.
  - `e2e/support/gameApi.ts` :: `MockOptions`, `mockGameApi` — support request counts and one-shot session GET/POST failures; modify.
  - `e2e/gameplay.spec.ts` :: gameplay start, pause, and resume journey — add the explicit entry selection before interaction; modify.

#### Details
- **Mock options**: extend `MockOptions` with optional `sessionReadFailures?: number` and `sessionCreateFailures?: number`; expose read/create request counters in the object returned by `mockGameApi`. Keep default behavior unchanged for existing scenarios.
- **Scenarios**:
  1. Guest home shows the Entra action and preview; no session POST occurs. E2E auth-mode home shows `게임 시작` linking to `/game`.
  2. On `/game` with no existing session, stage appears and `게임 시작` is visible; before click POST count stays zero. After click exactly one create POST occurs and gameplay reaches its existing start affordance.
  3. With an existing paused session, stage shows `이어하기`, does not create a new session during discovery, and selecting it restores the paused-run UI.
  4. A first GET failure displays the stage, inline error, and retry; clicking retry succeeds and shows the appropriate action without a page reload.
  5. A create POST failure keeps the stage and allows an explicit retry to create/start once.
  6. Existing `gameplay.spec.ts` journey still tests start, audio settings, pause, reload recovery, and continue, now selecting the entry CTA first.
- Respect reduced-motion preference in visual assertions; do not assert animation timing or rely on sound output.

### I02. Local Cosmos configuration guidance
- Related Files:
  - `docs/local-development.md` :: “Prerequisites and setup” and “Validation commands” — clarify local authentication options and safe setup; modify.
  - `.env.example` :: local Cosmos defaults and comments — read first, modify only if its guidance conflicts with actual runtime config.
  - `src/server/cosmos/env.ts` :: `getCosmosConfig` — read-only source of supported auth modes/defaults.
  - `src/server/cosmos/client.ts` :: Cosmos credential selection — read-only source of local credential behavior.

#### Details
- Read `.env.example`, `src/server/cosmos/env.ts`, and `src/server/cosmos/client.ts` before editing documentation. Document the actual accepted `COSMOS_AUTH_MODE` values, required endpoint/database variables, key requirements for `key` mode, and that managed identity/`DefaultAzureCredential` uses the developer's signed-in Azure identity locally.
- Explain that expired Azure CLI/MFA credentials can cause Cosmos-dependent session operations to return 500; direct the developer to refresh/re-authenticate the Azure CLI identity and retry health/session checks. Do not claim that the browser's Entra ID login renews Azure CLI credentials: these are separate auth paths.
- Preserve the security rule that local secrets remain in ignored `.env.local`; do not read, print, paste, or commit any secret value. Do not change runtime defaults or production identity configuration in this docs task.

### I03. Recover silent Entra token timeouts during session discovery
- Related Files:
  - `src/auth/AuthProvider.tsx` :: `getIdToken` — replace repeated `ssoSilent` calls with `acquireTokenSilent`; use an interactive redirect for interaction-required or MSAL iframe-timeout errors while preserving the current route.
  - `src/auth/AuthProvider.test.tsx` :: silent-token recovery classification — cover interaction-required, `monitor_window_timeout`/`timed_out`, and unrelated errors.
  - `src/components/game/PhaserCanvas.tsx` :: `formatGameLoadError` — show a concise sign-in recovery message if token refresh still fails; do not expose raw MSAL internals as the only user guidance.
- Evidence: the user screenshot shows a signed-in `/game` screen whose session discovery error contains the MSAL `timed_out` code. `AuthProvider.getIdToken` currently invokes `ssoSilent` after its cached ID token nears expiry.
- Keep the existing Entra redirect login and `/game` return path. Do not weaken token validation or change Cosmos auth settings as a workaround for this browser authentication error.

### I04. Exclude generated deployment bundles from lint input
- Related Files:
  - `eslint.config.mjs` :: `globalIgnores` — exclude generated `.deploy-package-*` trees so the documented full-repository lint command only inspects project source.
- Evidence: `npm run lint` currently enters `.deploy-package-97843d1/.next` and reports thousands of generated CommonJS `require()` violations. This directory is generated deployment output, not maintained application source.

## Acceptance Criteria
- [x] E2E coverage proves preview is visible before session API resolution and no create POST occurs before user action.
- [x] E2E coverage covers active-session resume, successful start, read retry, and start retry.
- [x] Existing gameplay/pause/resume E2E journey passes with the explicit entry action.
- [x] Local setup docs match code-supported Cosmos auth modes and distinguish Azure CLI/MFA from browser Entra auth.
- [x] No tests or docs require real Cosmos/Entra access, and no secret is exposed.
- [x] Existing-account token renewal uses the MSAL silent cache flow first and recovers timeout/interaction-required errors through a visible redirect login rather than repeating the same hidden-iframe request.
- [x] `npm run lint` ignores generated deploy-package output and passes for maintained project files.

## Validation
- `npm run test:e2e -- --grep "landing screen|protected route|game entry|player can tune audio|browser back pauses"` — mocked start/auth/gameplay flows pass.
- `npm run lint` — passes for updated E2E helpers/specs.
- `npm run typecheck` — passes for the mock helper and client code.

## Commit Message
```text
test(game): cover explicit session start and recovery

Plan: 2026-10-22-rhythm-game-intro-screen
Phase: P01-rhythm-game-intro-screen
Task: T04-cover-entry-flows-and-align-docs

- Verify read-only discovery and explicit session creation in E2E
- Clarify local Cosmos auth and MFA troubleshooting guidance
```

## Progress
- [x] Implementation complete: added entry/retry E2E coverage, corrected Cosmos and auth docs, recovered MSAL timeout renewals, and excluded generated deploy bundles from lint.
- [x] Validation passed: Edge E2E (12 passed), AuthProvider unit tests (5 passed), npm run lint, and npm run typecheck.
- commit: test(game): cover explicit session start and recovery
