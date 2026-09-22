import { jsonWithSession, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getSessionService, requireVersion } from '@/server/game/sessionService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (body.confirmed !== true) throw new Error('Explicit confirmation is required to abandon a run.');
      if (typeof body.runId !== 'string' || !body.runId) throw new Error('runId is required.');
      const version = requireVersion(request.headers.get('if-match') ?? String(body.expectedVersion ?? ''));
      const session = await getSessionService().abandon(identity, body.runId, version);
      return jsonWithSession(session);
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}
