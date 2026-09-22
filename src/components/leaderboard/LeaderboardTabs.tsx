'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import type { LeaderboardScope } from '@/server/leaderboard/leaderboardService';
import type { GameResultDocument } from '@/server/cosmos/models';
import { LeaderboardTable } from './LeaderboardTable';

type Page = { items: GameResultDocument[]; continuationToken?: string };

export function LeaderboardTabs() {
  const [scope, setScope] = useState<LeaderboardScope>('daily');
  return <section className={'leaderboard-card'}>
    <div className={'leaderboard-tabs'} role={'tablist'}>
      <button type={'button'} role={'tab'} aria-selected={scope === 'daily'} onClick={() => setScope('daily')}>오늘의 기록 🌱</button>
      <button type={'button'} role={'tab'} aria-selected={scope === 'all-time'} onClick={() => setScope('all-time')}>전체 기록 🏆</button>
    </div>
    <LeaderboardResults key={scope} scope={scope} />
  </section>;
}

function LeaderboardResults({ scope }: Readonly<{ scope: LeaderboardScope }>) {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<GameResultDocument[]>([]);
  const [continuationToken, setContinuationToken] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const fetchPage = useCallback(async (token?: string, append = false, signal?: AbortSignal) => {
    setLoading(!append);
    setLoadingMore(append);
    setError(undefined);
    try {
      const idToken = await getIdToken();
      const params = new URLSearchParams({ scope, limit: '50' });
      if (token) params.set('continuationToken', token);
      const response = await fetch(`/api/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal,
      });
      const body = await response.json() as Page & { error?: string };
      if (!response.ok) throw new Error(body.error ?? '순위표를 불러오지 못했습니다.');
      setItems((current) => append ? [...current, ...body.items] : body.items);
      setContinuationToken(body.continuationToken);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : '순위표를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getIdToken, scope]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void fetchPage(undefined, false, controller.signal);
    });
    return () => controller.abort();
  }, [fetchPage]);

  if (loading) return <p className={'leaderboard-message'} role={'status'}>기록을 모으는 중이에요…</p>;
  return <>
    {error ? <div className={'leaderboard-message leaderboard-error'} role={'alert'}>
      <p>{error}</p>
      <button type={'button'} onClick={() => void fetchPage(continuationToken, Boolean(items.length))}>다시 불러오기</button>
    </div> : null}
    {items.length ? <LeaderboardTable items={items} /> : error ? null : <p className={'leaderboard-message'}>아직 기록이 없어요. 첫 박자를 남겨볼까요?</p>}
    {continuationToken ? <button className={'leaderboard-more'} type={'button'} disabled={loadingMore} onClick={() => void fetchPage(continuationToken, true)}>
      {loadingMore ? '더 불러오는 중…' : '기록 더 보기 ↓'}
    </button> : null}
  </>;
}
