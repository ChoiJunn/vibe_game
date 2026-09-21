export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type AuthenticatedUser = {
  oid: string;
  displayName: string;
  email?: string;
  tenantId: string;
};

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  errorMessage: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
};
