type SmokeFetch = typeof fetch;

type HealthResponse = {
  status?: string;
  app?: { appName?: string; appVersion?: string; buildId?: string };
  dependencies?: { cosmos?: string };
};

function parseBaseUrl(value: string): URL {
  const url = new URL(value);
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(isLoopback && url.protocol === 'http:')) {
    throw new Error('The base URL must use HTTPS (HTTP is allowed only for localhost).');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The base URL must not contain credentials, query parameters, or a fragment.');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url;
}

async function request(fetcher: SmokeFetch, url: URL, token?: string): Promise<Response> {
  return fetcher(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
}

export async function runSmokeTest(
  baseUrl: string,
  idToken?: string,
  fetcher: SmokeFetch = fetch,
): Promise<void> {
  const base = parseBaseUrl(baseUrl);
  const landing = await request(fetcher, new URL(base), undefined);
  if (!landing.ok) throw new Error(`Landing page check failed with HTTP ${landing.status}.`);
  console.info('PASS landing page');

  const healthResponse = await request(fetcher, new URL('api/health', base));
  const health = await healthResponse.json().catch(() => ({})) as HealthResponse;
  if (
    !healthResponse.ok || health.status !== 'healthy' || health.dependencies?.cosmos !== 'available' ||
    !health.app?.appName || !health.app.appVersion || !health.app.buildId
  ) {
    throw new Error(`Health check failed with HTTP ${healthResponse.status}; Cosmos must be available and build metadata present.`);
  }
  console.info(`PASS health (${health.app.appName} ${health.app.appVersion}, build ${health.app.buildId})`);

  if (!idToken) {
    console.info('SKIP authenticated API checks; sign in and set SMOKE_TEST_ID_TOKEN to include them.');
    return;
  }

  const activeSession = await request(fetcher, new URL('api/game/session', base), idToken);
  if (!activeSession.ok) throw new Error(`Active session check failed with HTTP ${activeSession.status}.`);
  console.info('PASS authenticated active-session API');

  const leaderboard = await request(fetcher, new URL('api/leaderboard?scope=daily&limit=1', base), idToken);
  if (!leaderboard.ok) throw new Error(`Leaderboard check failed with HTTP ${leaderboard.status}.`);
  const page = await leaderboard.json().catch(() => ({})) as { items?: unknown };
  if (!Array.isArray(page.items)) throw new Error('Leaderboard response did not contain an items array.');
  console.info('PASS authenticated leaderboard API');
}

function readBaseUrl(args: string[]): string {
  const index = args.indexOf('--base-url');
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error('Usage: npm run smoke-test -- --base-url https://<app-host>');
  return value;
}

if (process.argv[1]?.endsWith('smoke-test.ts')) {
  runSmokeTest(readBaseUrl(process.argv.slice(2)), process.env.SMOKE_TEST_ID_TOKEN)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown smoke-test failure.';
      console.error(`FAIL ${message}`);
      process.exitCode = 1;
    });
}
