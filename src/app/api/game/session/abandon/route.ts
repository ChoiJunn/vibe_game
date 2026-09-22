import { invalidSessionRequest, jsonWithSession, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getSessionService, requireVersion } from '@/server/game/sessionService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (body.confirmed !== true) invalidSessionRequest('Explicit confirmation is required to abandon a run.');
      if (typeof body.runId !== 'string' || !body.runId) invalidSessionRequest('runId is required.');
      const version = requireVersion(request.headers.get('if-match') ??
        (typeof body.expectedVersion === 'string' ? body.expectedVersion : undefined));
      const abandoned = await getSessionService().abandon(identity, body.runId, version);
      return jsonWithSession(abandoned);
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}
