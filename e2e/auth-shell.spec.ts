import { expect, test } from '@playwright/test';

test('landing screen exposes the Entra login entry point', async ({ page }) => {
  const sessionCreates: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/game/session') && request.method() === 'POST') {
      sessionCreates.push(request.url());
    }
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entra ID 로그인' })).toBeVisible();
  await expect(page.getByText('스페이스바로 박자를 맞추고 오늘의 업무를 연주해 보세요.')).toBeVisible();
  await expect(page.locator('.landing-stage__preview')).toBeVisible();
  expect(sessionCreates).toHaveLength(0);
});

test('home intro fills desktop and mobile viewports with visible animated art', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/');

  const heading = page.getByRole('heading', { name: /오늘의 업무 리듬을/ });
  const instruction = page.getByText('스페이스바로 박자를 맞추고 오늘의 업무를 연주해 보세요.');
  const login = page.getByRole('button', { name: 'Entra ID 로그인' });
  const character = page.locator('.rhythm-preview__character');
  const moka = page.locator('.rhythm-preview__moka');
  const note = page.locator('.rhythm-preview__note--one');

  await expect(heading).toBeVisible();
  await expect(instruction).toBeVisible();
  await expect(login).toBeVisible();
  await expect(character).toBeVisible();
  await expect(moka).toBeVisible();
  await expect(page.locator('.rhythm-preview__lane')).toBeVisible();
  await expect.poll(() => character.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => moka.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  const desktopLayout = await page.evaluate(() => {
    const frameRect = document.querySelector('.page-shell--home > .game-frame')!.getBoundingClientRect();
    const stageRect = document.querySelector('.game-frame-content.landing-stage')!.getBoundingClientRect();
    const previewRect = document.querySelector('.landing-stage__preview')!.getBoundingClientRect();
    const characterRect = document.querySelector('.rhythm-preview__character')!.getBoundingClientRect();
    const mokaRect = document.querySelector('.rhythm-preview__moka')!.getBoundingClientRect();
    return {
      frame: { x: frameRect.x, y: frameRect.y, width: frameRect.width, height: frameRect.height },
      stage: { x: stageRect.x, y: stageRect.y, width: stageRect.width, height: stageRect.height },
      preview: { x: previewRect.x, y: previewRect.y, width: previewRect.width, height: previewRect.height },
      character: { x: characterRect.x, y: characterRect.y, right: characterRect.right, bottom: characterRect.bottom },
      moka: { x: mokaRect.x, y: mokaRect.y, right: mokaRect.right, bottom: mokaRect.bottom },
      circles: [
        getComputedStyle(document.querySelector('.game-frame')!, '::before').display,
        getComputedStyle(document.querySelector('.game-frame')!, '::after').display,
      ],
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    };
  });

  expect(desktopLayout.frame.width).toBeGreaterThanOrEqual(1920 * 0.95);
  expect(desktopLayout.frame.height).toBeGreaterThanOrEqual(800);
  expect(desktopLayout.preview).toEqual(desktopLayout.stage);
  for (const image of [desktopLayout.character, desktopLayout.moka]) {
    expect(image.x).toBeGreaterThanOrEqual(desktopLayout.stage.x);
    expect(image.y).toBeGreaterThanOrEqual(desktopLayout.stage.y);
    expect(image.right).toBeLessThanOrEqual(desktopLayout.stage.x + desktopLayout.stage.width);
    expect(image.bottom).toBeLessThanOrEqual(desktopLayout.stage.y + desktopLayout.stage.height);
  }
  expect(desktopLayout.circles).toEqual(['none', 'none']);
  expect(desktopLayout.document.width).toBeLessThanOrEqual(1920);
  expect(desktopLayout.document.height).toBeLessThanOrEqual(900);

  await page.screenshot({ path: testInfo.outputPath('home-intro-desktop.png'), fullPage: true });
  const characterMotionBefore = await character.evaluate((image) => getComputedStyle(image).transform);
  const noteMotionBefore = await note.evaluate((element) => getComputedStyle(element).left);
  await page.waitForTimeout(1100);
  expect(await character.evaluate((image) => getComputedStyle(image).transform)).not.toBe(characterMotionBefore);
  expect(await note.evaluate((element) => getComputedStyle(element).left)).not.toBe(noteMotionBefore);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(heading).toBeVisible();
  await expect(instruction).toBeVisible();
  await expect(login).toBeVisible();
  await expect(character).toBeVisible();
  await expect(moka).toBeVisible();
  const mobileLayout = await page.evaluate(() => {
    const frame = document.querySelector('.page-shell--home > .game-frame')!.getBoundingClientRect();
    const stage = document.querySelector('.game-frame-content.landing-stage')!.getBoundingClientRect();
    const preview = document.querySelector('.landing-stage__preview')!.getBoundingClientRect();
    const character = document.querySelector('.rhythm-preview__character')!.getBoundingClientRect();
    const moka = document.querySelector('.rhythm-preview__moka')!.getBoundingClientRect();
    return {
      frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
      preview: { x: preview.x, y: preview.y, width: preview.width, height: preview.height },
      images: [character, moka].map((image) => ({
        x: image.x,
        y: image.y,
        right: image.right,
        bottom: image.bottom,
      })),
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    };
  });
  expect(mobileLayout.frame.width).toBeLessThanOrEqual(390);
  expect(mobileLayout.frame.height).toBeGreaterThanOrEqual(740);
  expect(mobileLayout.preview).toEqual(mobileLayout.stage);
  for (const image of mobileLayout.images) {
    expect(image.x).toBeGreaterThanOrEqual(mobileLayout.stage.x);
    expect(image.y).toBeGreaterThanOrEqual(mobileLayout.stage.y);
    expect(image.right).toBeLessThanOrEqual(mobileLayout.stage.x + mobileLayout.stage.width);
    expect(image.bottom).toBeLessThanOrEqual(mobileLayout.stage.y + mobileLayout.stage.height);
  }
  expect(mobileLayout.document.width).toBeLessThanOrEqual(390);
  expect(mobileLayout.document.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: testInfo.outputPath('home-intro-mobile.png'), fullPage: true });

  expect(requests.some((url) => url.includes('/api/game/session'))).toBe(false);
});

test('home intro remains visible and static when reduced motion is requested', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/');

  const character = page.locator('.rhythm-preview__character');
  const moka = page.locator('.rhythm-preview__moka');
  const note = page.locator('.rhythm-preview__note--one');
  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entra ID 로그인' })).toBeVisible();
  await expect(character).toBeVisible();
  await expect(moka).toBeVisible();
  await expect(page.locator('.rhythm-preview__lane')).toBeVisible();
  await expect.poll(() => character.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect.poll(() => moka.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(character).toHaveCSS('animation-iteration-count', '1');
  await expect(note).toHaveCSS('animation-iteration-count', '1');
  expect(requests.some((url) => url.includes('/api/game/session'))).toBe(false);
});

test('protected route redirects unauthenticated visitors to the landing page', async ({ page }) => {
  await page.goto('/game');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /오늘의 업무 리듬을/ })).toBeVisible();
});
