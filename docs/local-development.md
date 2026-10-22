# Local development

## Prerequisites and setup

- Node.js 24 LTS (package compatibility floor: 20.9) and npm.
- Access to a development Microsoft Entra app registration and a development Cosmos DB account/database.

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` with the SPA's client/tenant IDs, local redirect URI, and Cosmos endpoint/database. The checked-in `.env.example` explicitly selects `COSMOS_AUTH_MODE=managed-identity`; locally this uses `DefaultAzureCredential`, including the Azure CLI identity after `az login`. Complete any required MFA in the CLI sign-in flow. The browser's Entra sign-in and the Azure CLI credential are separate sessions, so signing into the website does not refresh the CLI credential.

For local key-based development, set `COSMOS_AUTH_MODE=key` and add a development-only `COSMOS_KEY`. `COSMOS_ENDPOINT` and `COSMOS_DATABASE` are required in either mode. If `COSMOS_AUTH_MODE` is omitted, the application defaults to `key` outside production and `managed-identity` in production. Production requires managed identity and rejects `COSMOS_KEY`. Keep all actual local values in ignored `.env.local`; never commit or paste secrets.

If a session request fails with an Entra/MSAL `timed_out` message, refresh the browser sign-in session and retry; the app attempts silent token renewal first and restarts the interactive Entra redirect when the silent flow reports a timeout or requires interaction. If the session API instead returns a server error while using local managed identity, refresh the Azure CLI sign-in with `az login` (including MFA if prompted), then retry the health/session request. These are distinct authentication paths.

Initialize the database/container schema if needed:

```powershell
node --conditions=react-server --import tsx scripts/cosmos-init.ts
```

Run the app:

```powershell
npm run dev
```

Open `http://localhost:3000`, sign in, and allow the first user gesture to unlock audio. Use the in-game audio calibration before playing. Chrome and Edge are the configured E2E browser projects; audio latency depends on the device, browser, output device, and Bluetooth buffering, so recalibrate when those change.

## Validation commands

```powershell
npm run lint
npm run typecheck
npm test -- --run
npm run test:e2e
npm run build
```

Playwright runs against a local Next.js server. Its test fixture injects a test-only browser session and intercepts game APIs; it does not authenticate to Entra or access Cosmos DB. Do not enable or ship the E2E auth fixture in production.

For a production check, use `npm run smoke-test -- --base-url https://<app-host>`. The unauthenticated check covers the landing page and health endpoint. Authenticated checks are optional and require a real, short-lived ID token supplied through `SMOKE_TEST_ID_TOKEN`; do not place that token in a committed file or print it.
