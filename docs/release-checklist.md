# Release readiness checklist

Use this checklist for every candidate release. Attach the CI run, deployment/build ID, public smoke output, and human verification date. Do not mark a manual gate complete from a mocked E2E test. Record **Pass**, **Fail**, or **Not run** with evidence; a missing evidence item is not a pass.

## Automated gates

| Gate | Evidence | Status |
| --- | --- | --- |
| Lint | `npm run lint` output | Not run |
| Types | `npm run typecheck` output | Not run |
| Unit/component/API tests | `npm test -- --run` summary | Not run |
| Critical user flows | `npm run test:e2e` on Chromium and Edge | Not run |
| Production compilation | `npm run build` output | Not run |
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
- **Pass, deployed baseline only** — public smoke test found the landing page and healthy Cosmos readiness on the then-current deployment, build ID `f41eeb1232233fe29fb6c4da8ca8d7ae1f4ad8b4`. This is not the candidate commit; the candidate has not been deployed.
- **Not run** — authenticated smoke check and all manual production gates above. No real Entra sign-in or real-device audio/gameplay verification was performed in this run.

**Release status: automated local checks pass; production sign-off is pending.** The deployment workflow is manually dispatched, so pushing a commit to `main` does not deploy it automatically. After an authorized deployment of the candidate, rerun the public and authenticated smoke checks and complete the manual gates before treating it as production-ready.
