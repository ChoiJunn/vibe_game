import { describe, expect, it } from 'vitest';
import { GAME_VIEWPORT } from './config';

describe('game scaffold configuration', () => {
  it('keeps the desktop viewport at a 16:9 ratio', () => {
    expect(GAME_VIEWPORT.width / GAME_VIEWPORT.height).toBeCloseTo(GAME_VIEWPORT.aspectRatio);
  });
});
