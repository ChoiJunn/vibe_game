import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTION_ORDER } from '@/domain/rhythm';
import { GAME_ASSETS } from './assets';

const allAssets = [
  ...Object.values(GAME_ASSETS.backgrounds),
  ...Object.values(GAME_ASSETS.protagonist),
  ...Object.values(GAME_ASSETS.moka),
  ...Object.values(GAME_ASSETS.notes),
];

function readPng(path: string) {
  const file = readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, '')));
  expect(file.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    colorType: file[25],
  };
}

describe('GAME_ASSETS', () => {
  it('registers every journey section for backgrounds and note motifs', () => {
    expect(Object.keys(GAME_ASSETS.backgrounds).filter((key) => SECTION_ORDER.includes(key as typeof SECTION_ORDER[number]))).toEqual(SECTION_ORDER);
    expect(Object.keys(GAME_ASSETS.notes)).toEqual(SECTION_ORDER);
  });

  it('points to existing PNGs with the contracted canvas sizes', () => {
    for (const asset of allAssets) {
      expect(() => readPng(asset.path), asset.path).not.toThrow();
    }

    for (const asset of Object.values(GAME_ASSETS.backgrounds).filter((asset) => asset.key !== GAME_ASSETS.backgrounds.fever.key)) {
      expect(readPng(asset.path)).toMatchObject({ width: 1280, height: 720, colorType: 2 });
    }
    expect(readPng(GAME_ASSETS.backgrounds.fever.path)).toMatchObject({ width: 1672, height: 941, colorType: 2 });
    for (const asset of Object.values(GAME_ASSETS.protagonist)) {
      if (asset.key === GAME_ASSETS.protagonist.fever.key) {
        expect(readPng(asset.path)).toMatchObject({ width: 1024, height: 1536, colorType: 6 });
      } else {
        expect(readPng(asset.path)).toMatchObject({ width: 320, height: 320, colorType: 6 });
      }
    }
    for (const asset of [...Object.values(GAME_ASSETS.moka).filter((candidate) => candidate.key !== GAME_ASSETS.moka.fever.key), ...Object.values(GAME_ASSETS.notes)]) {
      expect(readPng(asset.path)).toMatchObject({ width: 128, height: 128, colorType: 6 });
    }
    expect(readPng(GAME_ASSETS.moka.fever.path)).toMatchObject({ width: 1214, height: 1295, colorType: 6 });
  });
});
