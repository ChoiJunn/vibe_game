'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/useAuth';
import { StatusMessage } from '@/components/ui/StatusMessage';

export function RequireAuth({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { status, errorMessage } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [router, status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="protected-state" aria-live="polite">
        <StatusMessage title="로그인 상태를 확인하고 있습니다..." />
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="protected-state" role="alert">
        <h1>로그인 설정을 확인해 주세요.</h1>
        <StatusMessage variant="error" title="인증 설정 오류">
          {errorMessage}
        </StatusMessage>
        <Link href="/">소개 화면으로 돌아가기</Link>
      </main>
    );
  }

  return children;
}
