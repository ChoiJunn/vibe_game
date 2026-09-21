'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/auth/useAuth';

export function TopBar() {
  const pathname = usePathname();
  const { status, user, signOut } = useAuth();

  return (
    <header className="top-bar">
      <Link className="top-bar__brand" href="/" aria-label="Office Rhythm Manager 홈">
        <span className="top-bar__mark" aria-hidden="true">♪</span>
        <span>Office Rhythm Manager</span>
      </Link>

      <nav className="top-bar__nav" aria-label="주요 메뉴">
        {status === 'authenticated' && user ? (
          <>
            <Link className={pathname === '/game' ? 'is-active' : ''} href="/game">
              게임
            </Link>
            <Link className={pathname === '/leaderboard' ? 'is-active' : ''} href="/leaderboard">
              순위표
            </Link>
            <span className="top-bar__user" title={user.email ?? user.displayName}>
              {user.displayName}
            </span>
            <button className="top-bar__signout" type="button" onClick={() => void signOut()}>
              로그아웃
            </button>
          </>
        ) : status === 'loading' ? (
          <span className="top-bar__status" role="status">로그인 확인 중</span>
        ) : null}
      </nav>
    </header>
  );
}
