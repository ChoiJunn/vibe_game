# Azure App Service deployment

This guide targets the Linux built-in Node.js runtime and the standalone Next.js output. The provisioning examples stay generic; the actual free-tier deployment choices are recorded below.

## Current free-tier deployment

- Resource group: `Vibe-Coding-Game-Jun` (West US 2)
- App Service: `vibe-game-jun-rhythm-260922` on Linux F1, Node 24 LTS; public URL `https://vibe-game-jun-rhythm-260922.azurewebsites.net`
- Cosmos DB for NoSQL: `vibe-coding-game-jun-cosmos`, database `office-rhythm`, single region, free tier enabled, 1,000 RU/s strict account throughput cap
- Key Vault: `vibe-game-jun-kv-260922`, Standard/RBAC; the app identity has `Key Vault Secrets User`, and the vault is intentionally empty until a genuine server secret exists
- Cosmos containers: `gameSessions` (`/userOid`) and `gameResults` (`/leaderboardKey`)

F1 is free and intended for trial/development, not supported as a production workload; it has shared CPU, memory, storage, and bandwidth quotas, and no production SLA. Cosmos DB free tier covers up to 1,000 RU/s and 25 GB of storage; storage beyond 25 GB can still incur charges even though the provisioned-throughput cap prevents adding RU/s above 1,000. Keep the dataset below 25 GB and do not change the F1 plan or Cosmos cap if zero-cost operation is required.

Key Vault Standard is transaction-metered. This deployment has no secret reads or writes because there is currently no server-side secret to store; adding Key Vault references or secrets can create billable operations.

## 1. Create or select the Azure resources

The game needs a Linux App Service, a Linux App Service plan, and an Azure Cosmos DB for NoSQL account/database. Use a dedicated resource group for this application. Do not reuse unrelated company Key Vaults or Cosmos accounts without their owners' approval.

The current repository has no project-specific Azure resource identifiers. Before running any create command, decide the resource group, globally unique web-app name, Azure region, and App Service plan/SKU. App Service pricing, always-on behavior, and availability vary by SKU and region.

In Azure Portal, create/select the App Service plan and web app with Node.js 24 LTS on Linux. Alternatively, after choosing names and pricing, the CLI shape is:

```powershell
az group create --name <resource-group> --location <region>
az appservice plan create --name <plan-name> --resource-group <resource-group> --location <region> --is-linux --sku <approved-sku>
az webapp create --name <globally-unique-app-name> --resource-group <resource-group> --plan <plan-name> --runtime 'NODE:24-lts'
```

Enable the web app's system-assigned managed identity, enforce HTTPS-only, and set the startup command to `node server.js`. Configure the App Service Health Check path as `/api/health` after verifying the chosen SKU supports the feature.

```powershell
az webapp identity assign --name <app-name> --resource-group <resource-group>
az webapp update --name <app-name> --resource-group <resource-group> --https-only true
az webapp config set --name <app-name> --resource-group <resource-group> --linux-fx-version 'NODE|24-lts' --startup-file 'node server.js'
```

App Service supplies the listening port. The generated standalone server reads `PORT`; do not hard-code port 3000 or add a wildcard CORS policy.

## 2. Configure runtime settings and identity permissions

Set these App Service application settings. `COSMOS_KEY` must be absent in production; the existing Cosmos client rejects key-based production access.

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `COSMOS_AUTH_MODE` | `managed-identity` |
| `COSMOS_ENDPOINT` | HTTPS endpoint of the selected Cosmos account |
| `COSMOS_DATABASE` | `office-rhythm` (or the approved database name) |
| `APP_NAME` | `Office Rhythm Manager` |
| `APP_VERSION` | Release version |
| `APP_BUILD_ID` | Full Git commit SHA, set by the deployment workflow |

Assign the App Service identity **Cosmos DB Built-in Data Contributor** at the application database scope (not subscription-wide). Cosmos DB's data-plane roles are separate from Azure management-plane Contributor roles. The application requires database metadata access and read/write access to its `gameSessions` and `gameResults` containers.

Initialize the selected database and containers once using the existing `scripts/cosmos-init.ts` command, authenticated as an authorized operator. The app identity should not receive account-key access or broad subscription permissions.

## 3. Entra configuration

This app uses MSAL browser sign-in and does not require an Entra client secret. Register the exact HTTPS origin as the SPA redirect URI and use the same origin as `NEXT_PUBLIC_ENTRA_REDIRECT_URI`. Set `NEXT_PUBLIC_ENTRA_CLIENT_ID`, `NEXT_PUBLIC_ENTRA_TENANT_ID`, and `NEXT_PUBLIC_ENTRA_REDIRECT_URI` as GitHub Actions Variables because Next.js embeds these public values at build time. Do not treat them as secrets or expect App Service runtime settings to change the already-built browser bundle.

The application serves its own `/api/*` routes from the same origin. Keep CORS disabled unless a separately approved cross-origin client is added; never use `Access-Control-Allow-Origin: *` with authenticated game APIs.

## 4. GitHub Actions OIDC deployment

The workflow in `.github/workflows/deploy.yml` is manually triggered and deploys to the protected GitHub Environment named `production`. Configure required reviewers on that environment before enabling it. Create a Microsoft Entra workload identity federation credential whose subject is `repo:ChoiJunn/vibe_game:environment:production` and whose issuer/audience are the GitHub Actions OIDC values. No publish profile or client secret is stored in GitHub.

Configure these GitHub Variables:

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`, `AZURE_WEBAPP_NAME`, `APP_VERSION`
- `NEXT_PUBLIC_ENTRA_CLIENT_ID`, `NEXT_PUBLIC_ENTRA_TENANT_ID`, `NEXT_PUBLIC_ENTRA_REDIRECT_URI`
- `COSMOS_ENDPOINT`, `COSMOS_DATABASE`

Grant the workflow identity only the permissions required to deploy and update settings on the selected App Service. Do not grant it Cosmos data access; that belongs to the App Service identity. Set `COSMOS_ENDPOINT` and `COSMOS_DATABASE` as non-secret GitHub Variables; the workflow applies them as App Service settings. The workflow never sets `COSMOS_KEY`.

The deployment creates a standalone package, deploys it, and runs public landing/health smoke checks. To run authenticated smoke checks manually after interactive Entra sign-in, pass a short-lived ID token through `SMOKE_TEST_ID_TOKEN`; never paste or print the token in logs or command history.

## 5. Operations and security

- Keep App Service HTTPS-only. Next.js adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`; HSTS is enforced at the Azure HTTPS boundary.
- `/api/health` is an uncached readiness check. It performs a time-bounded Cosmos database read and reports only healthy/degraded state, app version, build id, and dependency status—never endpoint values, tokens, keys, or exception details.
- Review App Service and Cosmos diagnostics after initial deployment. Do not log request authorization headers, input-event payloads, or Cosmos credentials.
- Entra sign-in callback, authenticated session GET, and leaderboard access still require a real browser sign-in; the CI smoke step does not impersonate a user.

## References

- [Configure Node.js apps in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs)
- [Managed identities for App Service](https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity)
- [Cosmos DB for NoSQL data-plane RBAC](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-connect-role-based-access-control)
