'use client';

import type { AccountInfo, PublicClientApplication } from '@azure/msal-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { entraAuthConfig } from './config';
import { createMsalClient, mapAccountToUser } from './msalClient';
import type { AuthContextValue, AuthStatus, AuthenticatedUser } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function getAuthErrorMessage(): string {
  if (!entraAuthConfig.isConfigured) {
    return 'Entra ID 환경 설정이 필요합니다. 관리자에게 앱 등록 정보를 확인해 주세요.';
  }

  return '로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.';
}

function getAccount(client: PublicClientApplication, redirectAccount?: AccountInfo | null): AccountInfo | null {
  const account = redirectAccount ?? client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;

  if (account) {
    client.setActiveAccount(account);
  }

  return account;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState<PublicClientApplication | null>(() => createMsalClient());
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(client ? null : getAuthErrorMessage());

  const syncAccount = useCallback((account: AccountInfo | null) => {
    const nextUser = mapAccountToUser(account);

    if (account && !nextUser) {
      setUser(null);
      setStatus('error');
      setErrorMessage('로그인 계정 정보를 확인할 수 없습니다. 관리자에게 문의해 주세요.');
      return;
    }

    setUser(nextUser);
    setStatus(nextUser ? 'authenticated' : 'unauthenticated');
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (isE2eAuthEnabled()) {
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        setUser({ oid: 'e2e-user', tenantId: 'e2e-tenant', displayName: 'E2E Rhythm Player' });
        setStatus('authenticated');
        setErrorMessage(null);
      });
      return () => { active = false; };
    }
    if (!client) {
      let active = true;
      queueMicrotask(() => { if (active) setStatus('error'); });
      return () => { active = false; };
    }

    let active = true;

    void client
      .initialize()
      .then(() => client.handleRedirectPromise())
      .then((result) => {
        if (!active) {
          return;
        }

        const account = getAccount(client, result?.account);
        const cachedToken = result?.idToken ?? readCachedIdToken();
        if (cachedToken) {
          setIdToken(cachedToken);
          cacheIdToken(cachedToken);
        }
        syncAccount(account);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setStatus('error');
        setErrorMessage(getAuthErrorMessage());
      });

    return () => {
      active = false;
    };
  }, [client, syncAccount]);

  const getIdToken = useCallback(async () => {
    if (isE2eAuthEnabled()) return 'e2e-placeholder-token';
    if (!client) throw new Error(getAuthErrorMessage());
    const account = getAccount(client);
    if (!account) throw new Error('로그인이 필요합니다.');

    if (idToken && !isNearExpiry(idToken)) return idToken;

    const result = await client.ssoSilent({
      scopes: [...entraAuthConfig.scopes],
      account,
      authority: entraAuthConfig.authority,
      redirectUri: entraAuthConfig.redirectUri,
    });
    setIdToken(result.idToken);
    cacheIdToken(result.idToken);
    return result.idToken;
  }, [client, idToken]);

  const signIn = useCallback(async () => {
    if (!client) {
      setStatus('error');
      setErrorMessage(getAuthErrorMessage());
      return;
    }

    setStatus('loading');
    await client.loginRedirect({
      scopes: [...entraAuthConfig.scopes],
      redirectUri: entraAuthConfig.redirectUri,
    });
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) {
      return;
    }

    setIdToken(null);
    clearCachedIdToken();
    await client.logoutRedirect({
      postLogoutRedirectUri: entraAuthConfig.redirectUri,
    });
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, errorMessage, signIn, signOut, getIdToken }),
    [errorMessage, getIdToken, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const ID_TOKEN_STORAGE_KEY = 'office-rhythm:entra-id-token';

function readCachedIdToken(): string | null {
  try {
    return window.sessionStorage.getItem(ID_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function cacheIdToken(token: string): void {
  try {
    window.sessionStorage.setItem(ID_TOKEN_STORAGE_KEY, token);
  } catch {
    // MSAL's own session cache remains available if browser storage is restricted.
  }
}

function clearCachedIdToken(): void {
  try {
    window.sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY);
  } catch {
    // The MSAL logout still proceeds when browser storage is restricted.
  }
}

function isNearExpiry(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }

  return context;
}

export function isE2eAuthEnabled(): boolean {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('office-rhythm:e2e-auth') === 'enabled';
  } catch {
    return false;
  }
}
