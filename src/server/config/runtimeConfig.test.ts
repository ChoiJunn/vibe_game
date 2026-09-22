import { describe, expect, it } from 'vitest';
import { getRuntimeConfig } from './runtimeConfig';

describe('getRuntimeConfig', () => {
  it('returns deployment metadata without exposing arbitrary environment values', () => {
    expect(getRuntimeConfig({
      APP_NAME: ' Office Rhythm ',
      APP_VERSION: '1.2.3',
      APP_BUILD_ID: 'abc123',
      COSMOS_KEY: 'must-not-be-returned',
      NODE_ENV: 'test',
    } as NodeJS.ProcessEnv)).toEqual({
      appName: 'Office Rhythm',
      appVersion: '1.2.3',
      buildId: 'abc123',
    });
  });

  it('uses safe defaults for local metadata', () => {
    expect(getRuntimeConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toEqual({
      appName: 'Office Rhythm Manager',
      appVersion: '0.1.0',
      buildId: 'development',
    });
  });
});
