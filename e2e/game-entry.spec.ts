import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('game preview is visible while active-session discovery is still pending', async ({ page }) => {
  const api = await mockGameApi(page, { sessionReadDelayMs: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');

  await expect.poll(() => api.getSessionReadCount()).toBe(1);
  await expect(page.locator('.game-play-surface__preview')).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(0);

  await page.getByRole('button', { name: '건너뛰기' }).click();
  await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
});

test('public home reaches the game without creating a session before the player chooses start', async ({ page }) => {
  const api = await mockGameApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const gameLink = page.getByRole('link', { name: '게임 시작' });
  await expect(gameLink).toBeVisible();
  await expect(gameLink).toHaveAttribute('href', '/game');
  expect(api.getSessionCreateCount()).toBe(0);

  await gameLink.click();
  await page.getByRole('button', { name: '건너뛰기' }).click();
  const startButton = page.getByRole('button', { name: '게임 시작' });
  await expect(startButton).toBeVisible();
  expect(api.getSessionReadCount()).toBe(1);
  expect(api.getSessionCreateCount()).toBe(0);

  await startButton.click();
  await expect(page.getByRole('button', { name: '리듬 시작' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(1);
});

test('player can resume a discovered paused session without creating another session', async ({ page }) => {
  const api = await mockGameApi(page, { existing: true, snapshot: { cursorMs: 1_200, score: 240 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();

  const resumeButton = page.getByRole('button', { name: '이어하기' });
  await expect(resumeButton).toBeVisible();
  expect(api.getSessionReadCount()).toBe(1);
  expect(api.getSessionCreateCount()).toBe(0);

  await resumeButton.click();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(0);
});

test('session discovery can be retried without reloading the page', async ({ page }) => {
  const api = await mockGameApi(page, { sessionReadFailures: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();

  await expect(page.locator('.game-entry-error')).toContainText('게임을 불러오지 못했어요');
  expect(api.getSessionReadCount()).toBe(1);
  await page.getByRole('button', { name: '다시 시도' }).click();

  await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
  expect(api.getSessionReadCount()).toBe(2);
  expect(api.getSessionCreateCount()).toBe(0);
});

test('session creation can be retried after an explicit start action', async ({ page }) => {
  const api = await mockGameApi(page, { sessionCreateFailures: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();

  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.locator('.game-entry-error')).toContainText('게임을 불러오지 못했어요');
  expect(api.getSessionCreateCount()).toBe(1);

  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('button', { name: '리듬 시작' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(2);
});
