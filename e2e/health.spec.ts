import { expect, test } from '@playwright/test';

test('home page boots with the game landing screen', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Office Rhythm Manager');
  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entra ID 로그인 준비 중' })).toBeDisabled();
});
