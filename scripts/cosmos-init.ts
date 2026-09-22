import { getCosmosClient } from '../src/server/cosmos/client';
import { getCosmosConfig } from '../src/server/cosmos/env';
import { GAME_CONTAINER_IDS } from '../src/server/cosmos/containers';

async function initializeCosmos(): Promise<void> {
  const config = getCosmosConfig();
  const client = getCosmosClient();

  try {
    await client.databases.createIfNotExists({ id: config.database });
    const database = client.database(config.database);
    await database.containers.createIfNotExists({
      id: GAME_CONTAINER_IDS.sessions,
      partitionKey: { paths: ['/userOid'] },
      defaultTtl: -1,
    });
    await database.containers.createIfNotExists({
      id: GAME_CONTAINER_IDS.results,
      partitionKey: { paths: ['/leaderboardKey'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: `/${String.fromCharCode(34)}_etag${String.fromCharCode(34)}/?` }],
        compositeIndexes: [[
          { path: '/leaderboardKey', order: 'ascending' },
          { path: '/score', order: 'descending' },
          { path: '/perfectCount', order: 'descending' },
          { path: '/durationMs', order: 'ascending' },
          { path: '/playedAt', order: 'ascending' },
          { path: '/id', order: 'ascending' },
        ]],
      },
    });

    console.info(`Cosmos database ${config.database} and game containers are ready.`);
  } finally {
    await client.dispose();
  }
}

initializeCosmos().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Cosmos initialization error.';
  console.error(`Cosmos initialization failed: ${message}`);
  process.exitCode = 1;
});
