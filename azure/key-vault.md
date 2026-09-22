# Key Vault and secret handling

## Current application posture

The production deployment has an empty Standard vault named `vibe-game-jun-kv-260922`; the App Service system-assigned identity has the **Key Vault Secrets User** role at the vault scope. The app intentionally performs no Key Vault operation yet because there is currently no application secret to read: Cosmos access uses the App Service identity, and Entra uses a public browser-client registration. Do not create or configure a production `COSMOS_KEY` secret, and do not store `NEXT_PUBLIC_ENTRA_*`, Cosmos endpoint/database names, or build metadata as secrets. Those values are identifiers/configuration, not credentials; the Entra values must be available during the Next.js build.

Keep the vault empty until a genuine server-only secret is introduced (for example, a separately adopted telemetry or third-party service credential). Key Vault Standard charges by authenticated secret/key/certificate operations; do not add references for public settings, and account for operation charges if a secret consumer is added.

## If a future server-only secret is introduced

1. Create/select a vault dedicated to the app/environment; do not reuse a vault owned by another workload.
2. Enable the App Service system-assigned identity (`az webapp identity assign`).
3. Assign that identity **Key Vault Secrets User** at the individual vault scope. Do not grant Secrets Officer or Contributor to the running app.
4. Add a server-only App Service setting using a versionless reference:

   ```text
   OPTIONAL_VENDOR_API_KEY=@Microsoft.KeyVault(SecretUri=https://<vault-name>.vault.azure.net/secrets/<secret-name>)
   ```

5. Read it only in `src/server/**`; never prefix it with `NEXT_PUBLIC_`, return it from an API, or include it in logs/build artifacts.
6. Confirm the App Service identity can resolve the reference and inspect Key Vault audit logs. Network-restricted vaults also need a valid App Service network path.

App Service resolves Key Vault references using its managed identity and caches them; rotating a versionless reference may take time to appear unless the app configuration is refreshed/restarted. Plan secret rotation accordingly. Keep development keys only in ignored `.env.local`; production must continue to use `COSMOS_AUTH_MODE=managed-identity` with no `COSMOS_KEY`.

Reference: [Use Key Vault references as App Service settings](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references).
