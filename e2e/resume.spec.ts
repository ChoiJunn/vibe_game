import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('paused run survives a page refresh and resumes from its saved score and position', async ({ page }) => {
  await mockGameApi(page, {
    existing: true,
    snapshot: { cursorMs: 700, nextEventIndex: 1, score: 100, combo: 1, maxCombo: 1, perfectCount: 1 },
  });
  await page.goto('/game');
  await page.locator('.game-entry-actions button').first().click();

  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '100' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '이어하기' })).toBeVisible();
  await page.getByRole('button', { name: '이어하기' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '100' })).toBeVisible();
});
