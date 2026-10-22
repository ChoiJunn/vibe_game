import { describe, expect, it, vi } from 'vitest';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import type { PublicClientApplication } from '@azure/msal-browser';
import { acquireIdTokenWithRecovery, getAuthErrorMessage, isSilentTokenRecoveryError } from './AuthProvider';

describe('AuthProvider errors', () => {
  it('explains missing Entra configuration without exposing secrets', () => {
    const message = getAuthErrorMessage(false);

    expect(message).toContain('Entra ID');
    expect(message).not.toContain('client-id');
    expect(message).not.toContain('tenant-id');
  });

  it('uses the generic login error when Entra configuration is present', () => {
    expect(getAuthErrorMessage(true)).not.toContain('Entra ID');
  });

  it('requests interactive recovery when silent token acquisition needs user action', () => {
    expect(isSilentTokenRecoveryError(new InteractionRequiredAuthError('interaction_required', 'test'))).toBe(true);
    expect(isSilentTokenRecoveryError({ errorCode: 'monitor_window_timeout' })).toBe(true);
    expect(isSilentTokenRecoveryError(new Error('timed_out: token request did not finish'))).toBe(true);
    expect(isSilentTokenRecoveryError(new Error('network unavailable'))).toBe(false);
  });

  it('uses the MSAL silent token cache before any interactive redirect', async () => {
    const acquireTokenSilent = vi.fn().mockResolvedValue({ idToken: 'fresh-id-token' });
    const acquireTokenRedirect = vi.fn();
    const client = { acquireTokenSilent, acquireTokenRedirect } as unknown as Pick<PublicClientApplication, 'acquireTokenSilent' | 'acquireTokenRedirect'>;

    await expect(acquireIdTokenWithRecovery(
      client,
      { scopes: ['openid'], redirectUri: 'http://localhost:3000' },
      vi.fn(),
      '/game',
    )).resolves.toBe('fresh-id-token');

    expect(acquireTokenSilent).toHaveBeenCalledOnce();
    expect(acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it('restarts Entra interactively and preserves the game route after a silent timeout', async () => {
    const timeoutError = new Error('timed_out');
    const acquireTokenSilent = vi.fn().mockRejectedValue(timeoutError);
    const acquireTokenRedirect = vi.fn().mockResolvedValue(undefined);
    const rememberReturnPath = vi.fn();
    const client = { acquireTokenSilent, acquireTokenRedirect } as unknown as Pick<PublicClientApplication, 'acquireTokenSilent' | 'acquireTokenRedirect'>;
    const request = { scopes: ['openid'], redirectUri: 'http://localhost:3000' };

    await expect(acquireIdTokenWithRecovery(client, request, rememberReturnPath, '/game')).rejects.toBe(timeoutError);

    expect(rememberReturnPath).toHaveBeenCalledWith('/game');
    expect(acquireTokenRedirect).toHaveBeenCalledWith({ ...request, redirectStartPage: '/game' });
  });
});
