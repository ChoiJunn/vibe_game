import { expect, test } from '@playwright/test';

test('landing screen exposes the Entra login entry point', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entra ID 설정 필요' })).toBeDisabled();
  await expect(page.getByText(/조직 계정으로 로그인하면/)).toBeVisible();
});

test('protected route fails closed when Entra configuration is missing', async ({ page }) => {
  await page.goto('/game');

  await expect(page.getByRole('heading', { name: '로그인 설정을 확인해 주세요.' })).toBeVisible();
  await expect(page.getByRole('link', { name: '소개 화면으로 돌아가기' })).toHaveAttribute('href', '/');
});
