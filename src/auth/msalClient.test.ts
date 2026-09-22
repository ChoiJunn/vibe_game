import { describe, expect, it } from 'vitest';
import type { AccountInfo } from '@azure/msal-browser';
import { ENTRA_SCOPES, isValidEntraConfig } from './config';
import { mapAccountToUser } from './msalClient';

describe('Entra authentication configuration', () => {
  it('uses only the minimum login scopes', () => {
    expect(ENTRA_SCOPES).toEqual(['openid', 'profile', 'email']);
  });

  it('requires client, tenant and redirect values', () => {
    expect(
      isValidEntraConfig({
        clientId: 'client-id',
        tenantId: 'tenant-id',
        redirectUri: 'http://localhost:3000',
      }),
    ).toBe(true);
    expect(isValidEntraConfig({ clientId: '', tenantId: 'tenant-id', redirectUri: 'http://localhost:3000' })).toBe(
      false,
    );
    expect(
      isValidEntraConfig({
        clientId: 'your-client-id',
        tenantId: 'tenant-id',
        redirectUri: 'http://localhost:3000',
      }),
    ).toBe(false);
  });

  it('rejects loopback redirects in production while allowing the deployed HTTPS origin', () => {
    const baseConfig = { clientId: 'client-id', tenantId: 'tenant-id' };

    expect(isValidEntraConfig({ ...baseConfig, redirectUri: 'http://127.0.0.1:3000' }, true)).toBe(false);
    expect(isValidEntraConfig({ ...baseConfig, redirectUri: 'http://localhost:3000' }, true)).toBe(false);
    expect(
      isValidEntraConfig({
        ...baseConfig,
        redirectUri: 'https://vibe-game-jun-rhythm-260922.azurewebsites.net',
      }, true),
    ).toBe(true);
    expect(isValidEntraConfig({ ...baseConfig, redirectUri: 'http://localhost:3000' }, false)).toBe(true);
  });
});

describe('mapAccountToUser', () => {
  it('maps oid, tenant id, display name and email from claims', () => {
    const account = {
      name: 'Choi Junn',
      username: 'junn@example.com',
      idTokenClaims: {
        oid: 'user-object-id',
        tid: 'tenant-id',
        name: 'Choi Junn',
        preferred_username: 'junn@example.com',
      },
    } as AccountInfo;

    expect(mapAccountToUser(account)).toEqual({
      oid: 'user-object-id',
      tenantId: 'tenant-id',
      displayName: 'Choi Junn',
      email: 'junn@example.com',
    });
  });

  it('rejects accounts without oid or tenant id claims', () => {
    const account = {
      name: 'Incomplete User',
      username: 'user@example.com',
      idTokenClaims: { name: 'Incomplete User' },
    } as AccountInfo;

    expect(mapAccountToUser(account)).toBeNull();
  });
});
