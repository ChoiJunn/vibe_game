import 'server-only';

export type CosmosAuthMode = 'key' | 'managed-identity';
export type CosmosConfig = { endpoint: string; database: string; authMode: CosmosAuthMode; key?: string };

export class CosmosConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'CosmosConfigurationError'; }
}

export function getCosmosConfig(env: NodeJS.ProcessEnv = process.env): CosmosConfig {
  const endpoint = env.COSMOS_ENDPOINT?.trim();
  const database = env.COSMOS_DATABASE?.trim();
  if (!endpoint || !database) throw new CosmosConfigurationError('COSMOS_ENDPOINT and COSMOS_DATABASE must be configured.');

  let endpointUrl: URL;
  try { endpointUrl = new URL(endpoint); } catch { throw new CosmosConfigurationError('COSMOS_ENDPOINT must be a valid HTTPS URL.'); }
  if (endpointUrl.protocol !== 'https:') throw new CosmosConfigurationError('COSMOS_ENDPOINT must use HTTPS.');

  const configuredMode = env.COSMOS_AUTH_MODE?.trim();
  const authMode = configuredMode ?? (env.NODE_ENV === 'production' ? 'managed-identity' : 'key');
  if (authMode !== 'key' && authMode !== 'managed-identity') throw new CosmosConfigurationError('COSMOS_AUTH_MODE must be key or managed-identity.');
  if (env.NODE_ENV === 'production' && authMode !== 'managed-identity') throw new CosmosConfigurationError('Production Cosmos access must use Managed Identity.');
  if (authMode === 'managed-identity') {
    if (env.COSMOS_KEY?.trim()) throw new CosmosConfigurationError('COSMOS_KEY must not be set when using Managed Identity.');
    return { endpoint, database, authMode };
  }

  const key = env.COSMOS_KEY?.trim();
  if (!key) throw new CosmosConfigurationError('COSMOS_KEY is required for local key-based development.');
  return { endpoint, database, authMode, key };
}
