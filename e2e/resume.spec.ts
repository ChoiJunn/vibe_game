import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('paused run survives a page refresh and resumes from its saved score and position', async ({ page }) => {
  await mockGameApi(page, {
    existing: true,
    snapshot: { cursorMs: 700, nextEventIndex: 1, score: 100, combo: 1, maxCombo: 1, perfectCount: 1 },
  });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();

  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await expect(page.getByText('점수 100', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await expect(page.getByText('점수 100', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '이어하기' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '100점' })).toBeVisible();
});
