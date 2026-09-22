import { getLeaderboardService, type LeaderboardScope } from '@/server/leaderboard/leaderboardService';
import { withGameIdentity } from '@/server/game/routeHelpers';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return withGameIdentity(request, async () => {
    const params = new URL(request.url).searchParams;
    const scope = params.get('scope') ?? 'daily';
    if (scope !== 'daily' && scope !== 'all-time') {
      return Response.json({ error: 'scope must be daily or all-time.' }, { status: 400 });
    }

    const rawLimit = params.get('limit') ?? '50';
    if (!/^\d+$/.test(rawLimit)) {
      return Response.json({ error: 'limit must be an integer from 1 to 100.' }, { status: 400 });
    }
    const limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return Response.json({ error: 'limit must be an integer from 1 to 100.' }, { status: 400 });
    }

    const continuationToken = params.get('continuationToken') ?? undefined;
    if (continuationToken && continuationToken.length > 16_384) {
      return Response.json({ error: 'continuationToken is too long.' }, { status: 400 });
    }

    try {
      const page = await getLeaderboardService().getLeaderboard(
        scope as LeaderboardScope,
        limit,
        continuationToken,
      );
      return Response.json(page, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ error: '순위표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
  });
}
