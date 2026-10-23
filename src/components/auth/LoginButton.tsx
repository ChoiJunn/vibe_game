'use client';

import { useAuth } from '@/auth/useAuth';
import Link from 'next/link';

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

  if (status === 'authenticated') {
    return (
      <Link className="login-placeholder" href="/game?start=1">
        게임 시작
      </Link>
    );
  }

  return (
    <button
      className="login-placeholder"
      type="button"
      onClick={() => void signIn()}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? '로그인 확인 중…' : 'Entra ID 로그인'}
    </button>
  );
}
