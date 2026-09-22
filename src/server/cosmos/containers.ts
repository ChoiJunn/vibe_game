import 'server-only';

import type { Container, Database } from '@azure/cosmos';
import { getCosmosClient } from './client';
import { getCosmosConfig } from './env';

export const GAME_CONTAINER_IDS = {
  sessions: 'gameSessions',
  results: 'gameResults',
} as const;

export type GameContainers = {
  database: Database;
  sessions: Container;
  results: Container;
};

export function getGameContainers(): GameContainers {
  const database = getCosmosClient().database(getCosmosConfig().database);
  return {
    database,
    sessions: database.container(GAME_CONTAINER_IDS.sessions),
    results: database.container(GAME_CONTAINER_IDS.results),
  };
}
