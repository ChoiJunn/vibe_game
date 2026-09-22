import { expect, test } from '@playwright/test';
import type { GameResultDocument } from '../src/server/cosmos/models';
import { mockGameApi } from './support/gameApi';

test('a browser Back action pauses a run and refresh resumes the saved state', async ({ page }) => {
  const api = await mockGameApi(page);
  await page.goto('/');
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await page.getByRole('button', { name: '리듬 시작' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await expect.poll(() => api.getSession()?.status).toBe('paused');

  await page.goto('/game');
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await expect(page.getByText('점수 0', { exact: true })).toBeVisible();
});

test('a saved zero-heart run retries failed-result submission after refresh instead of staying paused', async ({ page }) => {
  const api = await mockGameApi(page, {
    existing: true,
    resultFailures: 1,
    snapshot: { cursorMs: 6_000, nextEventIndex: 6, score: 100, hearts: 0, missCount: 5 },
  });

  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await expect(page.getByRole('heading', { name: '오늘의 업무 리듬 결과' })).toBeVisible();
  await expect(page.locator('.result-submission')).toContainText('페이지를 새로고침하면 다시 저장을 시도합니다');
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('결과가 저장되었습니다.')).toBeVisible();
  expect(api.getResult()?.status).toBe('failed');
});

test('leaderboard shows each completed attempt as its own row and supports both scopes', async ({ page }) => {
  const playedAt = '2026-09-22T08:00:00.000Z';
  const makeResult = (id: string, score: number): GameResultDocument => ({
    id,
    type: 'gameResult',
    userOid: 'e2e-user',
    displayName: 'Office player',
    beatmapId: 'office-day-01',
    leaderboardKey: 'daily:2026-09-22',
    status: 'completed',
    score,
    perfectCount: 2,
    goodCount: 0,
    missCount: 0,
    maxCombo: 2,
    durationMs: 2_100,
    playedAt,
    schemaVersion: 1,
  });
  const rankedResults = [makeResult('run-result-1', 200), makeResult('run-result-2', 180)];
  const requestedScopes: string[] = [];

  await page.addInitScript(() => window.sessionStorage.setItem('office-rhythm:e2e-auth', 'enabled'));
  await page.route('**/api/leaderboard**', async (route) => {
    const scope = new URL(route.request().url()).searchParams.get('scope') ?? 'daily';
    requestedScopes.push(scope);
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: rankedResults, continuationToken: undefined }),
    });
  });

  await page.goto('/leaderboard');
  await expect(page.getByRole('cell', { name: 'Office player' })).toHaveCount(2);
  await expect(page.getByRole('cell', { name: '200' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '180' })).toBeVisible();

  await page.getByRole('tab').nth(1).click();
  await expect.poll(() => requestedScopes).toContain('all-time');
  await expect(page.getByRole('cell', { name: 'Office player' })).toHaveCount(2);
});
