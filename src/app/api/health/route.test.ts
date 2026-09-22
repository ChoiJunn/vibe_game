import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readDatabase, runtimeConfig } = vi.hoisted(() => ({
  readDatabase: vi.fn(),
  runtimeConfig: vi.fn(() => ({ appName: 'Office Rhythm Manager', appVersion: '0.1.0', buildId: 'build-123' })),
}));

vi.mock('@/server/config/runtimeConfig', () => ({ getRuntimeConfig: runtimeConfig }));
vi.mock('@/server/cosmos/env', () => ({ getCosmosConfig: () => ({ database: 'office-rhythm' }) }));
vi.mock('@/server/cosmos/client', () => ({
  getCosmosClient: () => ({ database: () => ({ read: readDatabase }) }),
}));

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports app metadata and Cosmos availability without caching', async () => {
    readDatabase.mockResolvedValue({ resource: { id: 'office-rhythm' } });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(body).toMatchObject({
      status: 'healthy',
      app: { appVersion: '0.1.0', buildId: 'build-123' },
      dependencies: { cosmos: 'available' },
    });
    expect(JSON.stringify(body)).not.toMatch(/cosmos_key|token|secret/i);
  });

  it('returns a sanitized degraded result if config, identity, or Cosmos is unavailable', async () => {
    readDatabase.mockRejectedValue(new Error('sensitive connection detail'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: 'degraded', dependencies: { cosmos: 'unavailable' } });
    expect(JSON.stringify(body)).not.toContain('sensitive connection detail');
  });
});
