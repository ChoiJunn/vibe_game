# Game data retention

Cosmos DB stores game progress and results in the `office-rhythm` database. Data is partitioned by the signed-in Entra user's immutable object ID (`userOid`) for sessions and by leaderboard key for results. The display name comes from the authenticated identity and is shown on the leaderboard.

| Data | Container | Retention |
| --- | --- | --- |
| Active run snapshot and input events | `gameSessions` | No automatic expiration while active; a single active-session lock is maintained per user |
| Terminal session and its raw input events | `gameSessions` | 90 days after the run is finalized, then Cosmos TTL removes the document asynchronously |
| Final result (completed, failed, or abandoned) | `gameResults` | No TTL is configured; retained until an authorized operational deletion or an approved retention change |

Ranked history is narrower than stored history: only completed attempts are returned by leaderboard queries. Failed and abandoned attempts remain stored as terminal results but do not appear in rankings.

The 90-day TTL applies to the session/input-event document, not the final result. Do not describe all game data as “deleted after 90 days.” Cosmos TTL deletion is asynchronous, so the exact deletion instant is not a deadline. Review this policy against applicable privacy, retention, and account-deletion requirements before broad or business-critical use. Never log bearer tokens, authorization headers, raw input-event payloads, or Cosmos credentials.

Container partitioning, managed identity, and initialization details are in [Cosmos DB data layer](../src/server/cosmos/README.md).
