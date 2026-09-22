# Local development

## Prerequisites and setup

- Node.js 24 LTS (package compatibility floor: 20.9) and npm.
- Access to a development Microsoft Entra app registration and a development Cosmos DB account/database.

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` with the SPA's client/tenant IDs, local redirect URI, and development Cosmos endpoint/database/key. This project defaults to `COSMOS_AUTH_MODE=key` locally; use only a development account/key. `.env.local` is ignored and must not be committed. Production uses managed identity and must not set `COSMOS_KEY`.

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
