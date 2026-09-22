import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('a completed run is submitted and appears in the leaderboard', async ({ page }) => {
  await mockGameApi(page, { snapshot: { cursorMs: 2500, nextEventIndex: 3, score: 160, combo: 2, maxCombo: 2, perfectCount: 2 } });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await page.getByRole('button', { name: '리듬 시작' }).click();
  await page.locator('.phaser-canvas-shell').focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(1500);
  await page.keyboard.up('Space');

  await expect(page.getByRole('heading', { name: '오늘의 업무 리듬 결과' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('결과가 저장되었습니다.')).toBeVisible();
  await page.getByRole('button', { name: '나가기' }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole('cell', { name: '테스트 리듬러' })).toBeVisible();
});
