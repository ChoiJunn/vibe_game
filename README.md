# Office Rhythm Manager

A small, playable office-life rhythm game. Sign in with your Microsoft Entra ID account, keep a run safe when you pause or leave the game, and compare completed scores on daily and all-time leaderboards.

## Play locally

Requirements: Node.js 24 LTS (Node.js 20.9 or newer is supported by the package) and npm.

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local with your Entra app and local Cosmos DB development settings.
npm run dev
```

Open `http://localhost:3000`. Register that exact URL as an SPA redirect URI in the Entra app registration. Local play uses a Cosmos DB account/database; `.env.local` is ignored by Git. Never put secrets in `NEXT_PUBLIC_*` variables or commit `.env.local`.

Useful checks:

```powershell
npm run lint
npm run typecheck
npm test -- --run
npm run test:e2e
npm run build
npm run start
```

E2E runs use a browser-only test authentication fixture and mocked game APIs; they do not sign in to a real tenant or write to Cosmos DB. See [local development](docs/local-development.md) and [Entra setup](docs/entra-setup.md).

## Game and data rules

See [game rules](docs/game-rules.md) for timing, score, combo, and heart behavior. See [data retention](docs/data-retention.md) for the Cosmos DB record lifecycle.

## Azure release

The current deployment and configuration are documented in [Azure App Service operations](azure/app-service.md), [Key Vault guidance](azure/key-vault.md), and [rollback](azure/rollback.md). The production release gate is [release checklist](docs/release-checklist.md). The current F1 and Cosmos free-tier resources have quotas and are for development/trial use; “free tier” does not guarantee a zero bill if limits or metered services are exceeded.

Public smoke check (requires the deployed app to report healthy Cosmos connectivity):

```powershell
npm run smoke-test -- --base-url https://vibe-game-jun-rhythm-260922.azurewebsites.net
```

To include authenticated API checks, sign in with a real Entra user and set `SMOKE_TEST_ID_TOKEN` in the current shell only for the command. Never paste or commit the token. The smoke script does not print it.
