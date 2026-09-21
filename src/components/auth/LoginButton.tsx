'use client';

import { useAuth } from '@/auth/useAuth';

export function LoginButton() {
  const { status, errorMessage, signIn } = useAuth();

  if (status === 'error') {
    return (
      <div className="auth-action" role="status">
        <button className="login-placeholder" type="button" disabled>
          Entra ID 설정 필요
        </button>
        <p className="setup-note">{errorMessage}</p>
      </div>
    );
  }

  return (
    <button
      className="login-placeholder"
      type="button"
      onClick={() => void signIn()}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? '로그인 상태 확인 중...' : 'Entra ID로 로그인'}
    </button>
  );
}
