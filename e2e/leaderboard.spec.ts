import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('a completed result submission appears in the leaderboard', async ({ page }) => {
  await mockGameApi(page);
  await page.goto('/');

  const status = await page.evaluate(async () => {
    const response = await fetch('/api/game/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'e2e-completed-run',
        terminalStatus: 'completed',
        confirmed: false,
        claimedSnapshot: {
          runId: 'e2e-completed-run',
          userOid: 'e2e-user',
          beatmapId: 'office-day-01',
          status: 'completed',
          cursorMs: 2_800,
          nextEventIndex: 4,
          hearts: 5,
          combo: 2,
          maxCombo: 2,
          consecutivePerfects: 2,
          score: 160,
          perfectCount: 2,
          goodCount: 0,
          missCount: 0,
          updatedAt: new Date().toISOString(),
        },
      }),
    });
    return response.status;
  });
  expect(status).toBe(201);

  await page.goto('/leaderboard');
  await expect(page.getByRole('cell', { name: '테스트 리듬러' })).toBeVisible();
});
