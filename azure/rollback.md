# Production rollback

The workflow deploys a versioned standalone ZIP package from a Git commit. Preserve successful workflow runs/artifacts for at least 30 days and keep the corresponding source commit available.

## Roll back an application release

1. Stop additional production deployments by disabling/pausing the `production` GitHub Environment or workflow while investigating.
2. Identify the last known-good commit SHA from the failed deployment and the GitHub Actions run history.
3. Dispatch the production workflow for that known-good commit from GitHub Actions, after a reviewer approves the `production` environment. If the old artifact has expired, rebuild the exact commit and verify `npm run lint`, `npm run typecheck`, `npm test -- --run`, and the Chromium E2E suite before deploying it.
4. Wait for the deployment job and public `/api/health` smoke check. Then interactively sign in with Entra and verify active-session and leaderboard APIs.
5. Keep the failed package and logs for diagnosis; do not delete Azure resources or Cosmos data as a rollback step.

The deployment is application-only. It does not migrate or delete Cosmos data. If a future schema change is not backward-compatible, stop here and use a separately reviewed forward-fix/data-recovery plan; do not restore or overwrite production data from this app workflow.
