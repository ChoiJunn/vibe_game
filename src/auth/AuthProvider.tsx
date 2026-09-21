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
  const [status, setStatus] = useState<AuthStatus>(client ? 'loading' : 'error');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
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
    if (!client) {
      return;
    }

    let active = true;

    void client
      .initialize()
      .then(() => client.handleRedirectPromise())
      .then((result) => {
        if (!active) {
          return;
        }

        syncAccount(getAccount(client, result?.account));
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

    await client.logoutRedirect({
      postLogoutRedirectUri: entraAuthConfig.redirectUri,
    });
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, errorMessage, signIn, signOut }),
    [errorMessage, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }

  return context;
}
