import 'server-only';

export type RuntimeConfig = {
  appName: string;
  appVersion: string;
  buildId: string;
};

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    appName: env.APP_NAME?.trim() || 'Office Rhythm Manager',
    appVersion: env.APP_VERSION?.trim() || '0.1.0',
    buildId: env.APP_BUILD_ID?.trim() || (env.NODE_ENV === 'development' ? 'development' : 'unknown'),
  };
}
