import { getRuntimeConfig } from '@/server/config/runtimeConfig';
import { getCosmosClient } from '@/server/cosmos/client';
import { getCosmosConfig } from '@/server/cosmos/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEALTH_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(): Promise<Response> {
  const app = getRuntimeConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const config = getCosmosConfig();
    await getCosmosClient().database(config.database).read({ abortSignal: controller.signal });
    return Response.json({
      status: 'healthy',
      app,
      dependencies: { cosmos: 'available' },
      checkedAt: new Date().toISOString(),
    }, { headers: HEALTH_HEADERS });
  } catch {
    return Response.json({
      status: 'degraded',
      app,
      dependencies: { cosmos: 'unavailable' },
      checkedAt: new Date().toISOString(),
    }, { status: 503, headers: HEALTH_HEADERS });
  } finally {
    clearTimeout(timeout);
  }
}
