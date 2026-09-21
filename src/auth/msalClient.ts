import {
  type AccountInfo,
  PublicClientApplication,
  type Configuration,
} from '@azure/msal-browser';
import { entraAuthConfig } from './config';
import type { AuthenticatedUser } from './types';

let clientInstance: PublicClientApplication | null = null;

export function createMsalClient(): PublicClientApplication | null {
  if (!entraAuthConfig.isConfigured) {
    return null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  const configuration: Configuration = {
    auth: {
      clientId: entraAuthConfig.clientId,
      authority: entraAuthConfig.authority,
      redirectUri: entraAuthConfig.redirectUri,
      postLogoutRedirectUri: entraAuthConfig.redirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  };

  clientInstance = new PublicClientApplication(configuration);
  return clientInstance;
}

export function mapAccountToUser(account: AccountInfo | null): AuthenticatedUser | null {
  if (!account) {
    return null;
  }

  const claims = account.idTokenClaims as Record<string, unknown> | undefined;
  const oid = typeof claims?.oid === 'string' ? claims.oid : '';
  const tenantId = typeof claims?.tid === 'string' ? claims.tid : '';

  if (!oid || !tenantId) {
    return null;
  }

  const claimDisplayName = typeof claims?.name === 'string' ? claims.name : '';
  const displayName = claimDisplayName || account.name || '사용자';
  const claimEmail = typeof claims?.preferred_username === 'string' ? claims.preferred_username : '';
  const email = claimEmail || account.username || undefined;

  return {
    oid,
    displayName,
    email,
    tenantId,
  };
}
