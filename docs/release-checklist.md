# Release readiness checklist

Use this checklist for every candidate release. Attach the CI run, deployment/build ID, public smoke output, and human verification date. Do not mark a manual gate complete from a mocked E2E test. Record **Pass**, **Fail**, or **Not run** with evidence; a missing evidence item is not a pass.

## Automated gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Lint | `npm run lint` output | Pass (one pre-existing warning) |
| Types | `npm run typecheck` output | Pass |
| Unit/component/API tests | `npm test -- --run` summary | Pass (25 files, 67 tests) |
| Critical user flows | `npm run test:e2e` on Chromium and Edge | Pass (20 tests) |
| Production compilation | `npm run build` output | Pass |
| Deployed public smoke | `npm run smoke-test -- --base-url https://<app-host>`; landing + healthy Cosmos dependency + build metadata | Not run |

## Manual production gates

| Requirement | Verification | Status |
| --- | --- | --- |
| Entra login | Sign in with a real account from the intended tenant; verify callback and displayed name | Not run |
| Playable rhythm input and Web Audio | Start a real run, calibrate audio, hit prompts, and verify judgement feedback | Not run |
| Pause/back and refresh resume | Pause, use browser Back, return, then refresh; verify the same score and position resume | Not run |
| Single active session | Open a second browser context for the same account and confirm the server prevents a second active run | Not run |
| Abandon confirmation | Choose abandon, cancel once, then confirm separately; confirm only the latter finalizes the run | Not run |
| Result persistence and validation | Complete a run; verify the result is persisted, and a forged score request is rejected without a ranked entry | Not run |
| Leaderboards | Check daily and all-time scopes, multiple completed rows from the same user, and absence of failed/abandoned attempts | Not run |
| Display name | Verify the Entra display name is shown and no token/secret is exposed | Not run |
| Accessibility | Keyboard-only navigation, visible focus, useful labels/status announcements, and reduced-motion behavior | Not run |
| Browser coverage | Repeat the real sign-in/game/audio checks in current Chrome and Edge | Not run |
| Security/data handling | Inspect logs/config: no tokens, raw event payloads, or Cosmos keys; confirm 90-day raw-event and indefinite result retention are understood | Not run |

The current Azure app runs on a free development/trial tier with shared quotas and no production SLA. Cosmos free-tier capacity and Key Vault transaction metering also have limits. Review [Azure App Service operations](../azure/app-service.md) and [data retention](data-retention.md) before inviting more users. A technically healthy deployment is not by itself production approval.

## Verification record — 2026-09-22

Local candidate checks completed:

- **Pass** — `npm run lint` (0 errors; one pre-existing unused-variable warning in `src/server/game/validateRun.test.ts:72`).
- **Pass** — `npm run typecheck`.
- **Pass** — `npm test -- --run` (25 files, 67 tests).
- **Pass** — `npm run test:e2e` (18 tests across Chromium and Edge; test-only auth and mocked APIs).
- **Pass** — `npm run build`.
- **Pass** — deployed candidate via ZIP to the confirmed App Service on 2026-09-22; deployment `5f98165a-61c3-494e-b5b7-0eeab0d30878` finished `RuntimeSuccessful` with one successful instance and no failed instances.
- **Pass** — post-deployment public smoke reports healthy Cosmos readiness and build ID `e065b1f604fb75efa8c8e83a3209328fd95ad042`. `/game` and `/leaderboard` returned 200; unauthenticated session and leaderboard APIs returned 401.
- **Not run** — authenticated smoke check and real Entra sign-in / real-device audio and gameplay gates. No user ID token was supplied.

**Release status: automated local checks and candidate deployment pass; production sign-off is pending.** The deployment workflow is manually dispatched, so pushing a commit to `main` does not deploy it automatically. Complete the real sign-in and device-level audio/gameplay checks, then run the authenticated smoke test before treating it as production-ready.

## Verification record — 2026-09-22 failed-session recovery

- **Pass** — zero-heart active sessions restore as failed results instead of paused runs; failed result submission is retried after refresh.
- **Pass** — `npm run lint` (0 errors; one pre-existing unused-variable warning in `src/server/game/validateRun.test.ts:72`).
- **Pass** — `npm run typecheck`.
- **Pass** — `npm test -- --run` (25 files, 67 tests).
- **Pass** — `npm run test:e2e` (20 tests across Chromium and Edge, including one temporary result API failure followed by a successful retry after refresh).
- **Pass** — `npm run build`.
- **Pending** — deploy this recovery fix and record its deployment/build ID and public smoke result below.
- **Not run** — real Entra sign-in, physical-device audio/gameplay, and authenticated smoke; these still require a real user session and device interaction.
