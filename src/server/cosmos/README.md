# Cosmos DB Data Layer

This module is server-only. Do not import it from Client Components or add Cosmos credentials to `NEXT_PUBLIC_*` variables.

## Containers and partitioning

| Container | Partition key | Retention |
| --- | --- | --- |
| `gameSessions` | `/userOid` | Active sessions have no item TTL. Once terminal, the session/input-event document gets a 90-day TTL. |
| `gameResults` | `/leaderboardKey` | No TTL; terminal result documents are retained. |

An active session stores `id = runId`. A companion `__active__` lock document is written in the same user partition and transaction; this makes the one-active-session-per-user rule safe against simultaneous creates. The lock is removed in the same transaction that marks the session terminal.

Snapshot and input-event updates use the document ETag with `If-Match`. A stale write becomes `CosmosPreconditionFailedError` with status 412 so the API layer can reload the latest state rather than treating the conflict as a generic storage failure.

Leaderboard keys are `daily:YYYY-MM-DD` (UTC date) or `all-time`. Leaderboard reads are authenticated, parameterized, partition-scoped, bounded to 100 rows per page, and return every terminal attempt. Ordering is score descending, Perfect count descending, duration ascending, then played time ascending. The container uses a matching composite index; the continuation token is opaque and is passed back to Cosmos unchanged.

## Authentication and setup

- Local development: set `COSMOS_AUTH_MODE=key`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, and a local `COSMOS_KEY` in the ignored `.env.local` file.
- Azure production: set `COSMOS_AUTH_MODE=managed-identity`, configure endpoint/database, remove `COSMOS_KEY`, and grant the App Service managed identity the required Cosmos DB data-plane role.
- Initialize the database and containers with `node --conditions=react-server --import tsx scripts/cosmos-init.ts`. The command creates the database and containers if absent; it does not print credentials.
- `gameSessions` enables container TTL with per-item expiration. `gameResults` has no TTL setting.
- Existing `gameResults` containers created before the leaderboard composite index was added may need that index policy applied through Azure Portal or a controlled container migration; `createIfNotExists` does not update an existing container's policy.
