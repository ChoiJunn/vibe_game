import 'server-only';

import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { getCosmosConfig } from './env';

let cosmosClient: CosmosClient | undefined;

export function getCosmosClient(): CosmosClient {
  if (cosmosClient) return cosmosClient;

  const config = getCosmosConfig();
  cosmosClient = config.authMode === 'managed-identity'
    ? new CosmosClient({
      endpoint: config.endpoint,
      // App Service uses its managed identity. Local development uses the
      // already signed-in Azure CLI / developer credential chain.
      aadCredentials: process.env.NODE_ENV === 'production'
        ? new ManagedIdentityCredential()
        : new DefaultAzureCredential(),
    })
    : new CosmosClient({ endpoint: config.endpoint, key: config.key! });

  return cosmosClient;
}
