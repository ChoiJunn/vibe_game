import { invalidSessionRequest, jsonWithSession, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getSessionService, requireVersion, validatePauseReason, validateSnapshot } from '@/server/game/sessionService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (typeof body.runId !== 'string' || !body.runId) invalidSessionRequest('runId is required.');
      validatePauseReason(body.reason);
      const snapshot = validateSnapshot(body.snapshot, identity, body.runId);
      const version = requireVersion(request.headers.get('if-match') ?? String(body.expectedVersion ?? ''));
      const session = await getSessionService().pause(
        identity, body.runId, { ...snapshot, status: 'paused' }, version,
      );
      return jsonWithSession(session);
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}
