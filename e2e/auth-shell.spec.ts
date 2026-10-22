import { expect, test } from '@playwright/test';

test('landing screen exposes the Entra login entry point', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entra ID 로그인' })).toBeVisible();
  await expect(page.getByText('스페이스바로 박자를 맞추고 오늘의 업무를 연주해 보세요.')).toBeVisible();
});

test('protected route redirects unauthenticated visitors to the landing page', async ({ page }) => {
  await page.goto('/game');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
});
