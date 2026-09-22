import { describe, expect, it } from 'vitest';
import { CosmosConfigurationError, getCosmosConfig } from './env';

const validLocalEnv = {
  NODE_ENV: 'development',
  COSMOS_ENDPOINT: 'https://rhythm.documents.azure.com:443/',
  COSMOS_DATABASE: 'office-rhythm',
  COSMOS_KEY: 'local-test-key',
} as NodeJS.ProcessEnv;

describe('getCosmosConfig', () => {
  it('uses an explicit account key only for local development', () => {
    expect(getCosmosConfig(validLocalEnv)).toEqual({
      endpoint: 'https://rhythm.documents.azure.com:443/',
      database: 'office-rhythm',
      authMode: 'key',
      key: 'local-test-key',
    });
  });

  it('selects Managed Identity by default in production and never returns the key', () => {
    const config = getCosmosConfig({
      NODE_ENV: 'production',
      COSMOS_ENDPOINT: 'https://rhythm.documents.azure.com/',
      COSMOS_DATABASE: 'office-rhythm',
    });

    expect(config).toEqual({
      endpoint: 'https://rhythm.documents.azure.com/',
      database: 'office-rhythm',
      authMode: 'managed-identity',
    });
  });

  it('rejects a key or explicit key mode in production', () => {
    expect(() => getCosmosConfig({ ...validLocalEnv, NODE_ENV: 'production' })).toThrow(CosmosConfigurationError);
    expect(() => getCosmosConfig({
      ...validLocalEnv,
      NODE_ENV: 'production',
      COSMOS_AUTH_MODE: 'key',
      COSMOS_KEY: '',
    })).toThrow(/Managed Identity/);
  });

  it('requires a configured HTTPS endpoint, database, and local key', () => {
    expect(() => getCosmosConfig({ NODE_ENV: 'development' })).toThrow(/COSMOS_ENDPOINT/);
    expect(() => getCosmosConfig({ ...validLocalEnv, COSMOS_ENDPOINT: 'http://localhost:8081' })).toThrow(/HTTPS/);
    expect(() => getCosmosConfig({ ...validLocalEnv, COSMOS_KEY: '' })).toThrow(/COSMOS_KEY/);
  });

  it('rejects invalid authentication modes and keys alongside Managed Identity', () => {
    expect(() => getCosmosConfig({ ...validLocalEnv, COSMOS_AUTH_MODE: 'password' })).toThrow(/COSMOS_AUTH_MODE/);
    expect(() => getCosmosConfig({ ...validLocalEnv, COSMOS_AUTH_MODE: 'managed-identity' })).toThrow(/COSMOS_KEY/);
  });
});
