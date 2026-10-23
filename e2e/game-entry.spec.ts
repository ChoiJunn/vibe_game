import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('game preview is visible while active-session discovery is still pending', async ({ page }) => {
  const api = await mockGameApi(page, { sessionReadDelayMs: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');

  await expect.poll(() => api.getSessionReadCount()).toBe(1);
  await expect(page.locator('.game-play-surface__preview')).toBeVisible();
  await expect.poll(() => page.locator('.game-stage-shell').evaluate((element) => getComputedStyle(element, '::before').backgroundImage)).toBe('none');
  await expect(page.locator('.game-stage-shell')).toHaveCSS('background-color', 'rgb(36, 36, 39)');
  const frameDecoration = await page.locator('.game-page .game-frame').evaluate((frame) => {
    const style = getComputedStyle(frame, '::after');
    const rect = frame.getBoundingClientRect();
    return {
      background: style.backgroundColor,
      opacity: style.opacity,
      width: Number.parseFloat(style.width) + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth),
      height: Number.parseFloat(style.height) + Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth),
      frameWidth: rect.width,
      frameHeight: rect.height,
    };
  });
  expect(frameDecoration.background).toBe('rgba(0, 0, 0, 0)');
  expect(frameDecoration.opacity).toBe('1');
  expect(Math.abs(frameDecoration.width - frameDecoration.frameWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(frameDecoration.height - frameDecoration.frameHeight)).toBeLessThanOrEqual(1);
  expect(api.getSessionCreateCount()).toBe(0);

  await page.locator('.game-entry-button').click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(1);
});

test('home game-start CTA starts gameplay directly without showing the tutorial', async ({ page }) => {
  const api = await mockGameApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const gameLink = page.getByRole('link', { name: '게임 시작' });
  await expect(gameLink).toBeVisible();
  await expect(gameLink).toHaveAttribute('href', '/game?start=1');
  expect(api.getSessionCreateCount()).toBe(0);

  await gameLink.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionReadCount()).toBe(1);
  expect(api.getSessionCreateCount()).toBe(1);
});

test('home start intent starts gameplay immediately without a tutorial dialog', async ({ page }) => {
  const api = await mockGameApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game?start=1');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(1);
});

test('saved-session choices are centered and resume without creating another session', async ({ page }) => {
  const api = await mockGameApi(page, { existing: true, snapshot: { cursorMs: 1_200, score: 240 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game?start=1');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAttribute('aria-labelledby', 'game-session-choice-title');
  await expect(dialog.getByRole('heading', { name: '저장된 리듬이 있어요' })).toBeVisible();
  const resumeButton = page.getByRole('button', { name: '이어하기' });
  await expect(resumeButton).toBeVisible();
  await expect(resumeButton).toBeFocused();
  await expect(page.getByRole('button', { name: '새 게임' })).toBeVisible();
  expect(api.getSessionReadCount()).toBe(1);
  expect(api.getSessionCreateCount()).toBe(0);

  const expectDialogCentered = async () => {
    const centers = await dialog.evaluate((element) => {
      const dialogRect = element.getBoundingClientRect();
      const stageRect = element.closest('.game-session-choice-overlay')?.parentElement?.getBoundingClientRect();
      if (!stageRect) throw new Error('Game stage was not found for the saved-session dialog.');
      return {
        dialogX: dialogRect.left + dialogRect.width / 2,
        dialogY: dialogRect.top + dialogRect.height / 2,
        stageX: stageRect.left + stageRect.width / 2,
        stageY: stageRect.top + stageRect.height / 2,
      };
    });
    expect(Math.abs(centers.dialogX - centers.stageX)).toBeLessThanOrEqual(2);
    expect(Math.abs(centers.dialogY - centers.stageY)).toBeLessThanOrEqual(2);
  };
  await expectDialogCentered();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectDialogCentered();

  await resumeButton.click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(0);
});

test('session discovery can be retried without reloading the page', async ({ page }) => {
  const api = await mockGameApi(page, { sessionReadFailures: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await expect(page.locator('.game-entry-error')).toContainText('게임을 불러오지 못했어요');
  expect(api.getSessionReadCount()).toBe(1);
  await page.getByRole('button', { name: '다시 시도' }).click();
  await page.locator('.game-entry-button').click();

  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionReadCount()).toBe(2);
  expect(api.getSessionCreateCount()).toBe(1);
});

test('session creation can be retried after an explicit start action', async ({ page }) => {
  const api = await mockGameApi(page, { sessionCreateFailures: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.locator('.game-entry-button').click();

  await expect(page.locator('.game-entry-error')).toContainText('게임을 불러오지 못했어요');
  expect(api.getSessionCreateCount()).toBe(1);

  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(2);
});

test('direct game route keeps an explicit start panel without showing a tutorial', async ({ page }) => {
  const api = await mockGameApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.game-entry-panel .game-entry-button')).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(0);
  await page.locator('.game-entry-panel .game-entry-button').click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getSessionCreateCount()).toBe(1);
});

test('new game closes the saved run before creating and starting another run', async ({ page }) => {
  const api = await mockGameApi(page, { existing: true, snapshot: { cursorMs: 1_200, score: 240 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.getByRole('button', { name: '새 게임' }).click();

  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  expect(api.getAbandonedRunIds()).toContain('e2e-run-01');
  expect(api.getSessionCreateCount()).toBe(1);
});
