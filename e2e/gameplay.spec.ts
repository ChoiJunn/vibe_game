import { expect, test } from '@playwright/test';
import { mockGameApi } from './support/gameApi';

test('player can tune audio, start a run, pause, and continue without losing the run', async ({ page }) => {
  await mockGameApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await expect(page.getByRole('button', { name: '리듬 시작' })).toBeVisible();

  await page.getByText('사운드와 판정 설정').click();
  const musicVolume = page.getByRole('slider', { name: '음악 볼륨' });
  await page.keyboard.press('Tab');
  await expect(musicVolume).toBeFocused();
  await expect.poll(() => musicVolume.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('3px');
  await expect.poll(() => page.locator('.calibration-beat').evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.getByRole('checkbox', { name: '모든 소리 음소거' }).check();
  await expect(page.getByText('설정은 이 브라우저에만 저장되며 로그인 토큰이나 프로필 정보는 저장하지 않습니다.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await page.getByText('사운드와 판정 설정').click();
  await expect(page.getByRole('checkbox', { name: '모든 소리 음소거' })).toBeChecked();
  await page.getByRole('button', { name: '이어하기' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await page.getByRole('button', { name: '이어하기' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();
});

test('browser back pauses the active run instead of navigating away', async ({ page }) => {
  await mockGameApi(page);
  await page.goto('/');
  await page.goto('/game');
  await page.getByRole('button', { name: '건너뛰기' }).click();
  await page.getByRole('button', { name: '리듬 시작' }).click();
  await expect(page.getByRole('button', { name: '일시정지' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: '잠시 멈췄어요' })).toBeVisible();
  await expect(page.getByText('뒤로가기를 눌러 현재 게임을 보호했습니다.')).toBeVisible();
});
