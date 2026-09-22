# Microsoft Entra ID setup

The browser uses MSAL as a public SPA client. It does not have a client secret. Server APIs validate the bearer ID token and derive the user and tenant identity from its signed claims.

## App registration

1. In the app registration **Authentication** settings, add a **Single-page application (SPA)** redirect URI for each environment. Local development uses `http://localhost:3000`; the current deployed app uses `https://vibe-game-jun-rhythm-260922.azurewebsites.net`.
2. Keep redirect URIs exact (scheme, hostname, port, and path). Do not add wildcard redirect URIs.
3. This app requests the signed-in user's ID token for its own authentication. Do not add Graph delegated permissions unless a separately reviewed feature needs them.
4. Record the Directory (tenant) ID and Application (client) ID as public configuration. Never create a client secret for this SPA or publish a secret as a `NEXT_PUBLIC_*` value.

## Environment values

Set these values locally in the ignored `.env.local` file, or in the deployment build environment as appropriate:

```dotenv
NEXT_PUBLIC_ENTRA_CLIENT_ID=<application-client-id>
NEXT_PUBLIC_ENTRA_TENANT_ID=<directory-tenant-id>
NEXT_PUBLIC_ENTRA_REDIRECT_URI=http://localhost:3000
```

For a production build, use the production redirect URI. These values are public identifiers and are embedded in the browser bundle. Do not put access tokens, ID tokens, client secrets, or Cosmos keys in them. The production app uses Entra sign-in plus a system-assigned managed identity for Cosmos DB; see [Azure App Service operations](../azure/app-service.md).

## Verify the setup

- Open the app and sign in with an account from the intended tenant.
- Confirm the browser returns to the registered URI and the app shows the signed-in display name.
- Start a run and verify authenticated session APIs work; finish one and confirm the result appears in the leaderboard.
- Test a second browser session for the same user: the server must enforce one active run at a time.
- Sign out, then verify `/game` and `/leaderboard` return to the sign-in entry point.

Playwright E2E tests use an isolated test-only auth fixture and cannot replace this real-tenant verification. Never share a real token in logs, issues, screenshots, or shell history.
