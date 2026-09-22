import 'server-only';

import { CosmosClient } from '@azure/cosmos';
import { ManagedIdentityCredential } from '@azure/identity';
import { getCosmosConfig } from './env';

let cosmosClient: CosmosClient | undefined;

export function getCosmosClient(): CosmosClient {
  if (cosmosClient) return cosmosClient;

  const config = getCosmosConfig();
  cosmosClient = config.authMode === 'managed-identity'
    ? new CosmosClient({ endpoint: config.endpoint, aadCredentials: new ManagedIdentityCredential() })
    : new CosmosClient({ endpoint: config.endpoint, key: config.key! });

  return cosmosClient;
}
