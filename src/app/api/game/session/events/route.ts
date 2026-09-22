import { invalidSessionRequest, jsonWithSession, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getSessionService, requireVersion, validateEvents, validateSnapshot } from '@/server/game/sessionService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (typeof body.runId !== 'string' || !body.runId) invalidSessionRequest('runId is required.');
      if (!Number.isSafeInteger(body.clientSequence) || Number(body.clientSequence) < 0) {
        invalidSessionRequest('clientSequence is required.');
      }
      const events = validateEvents(body.events);
      if (events.length && events[0].clientSequence !== body.clientSequence) {
        invalidSessionRequest('clientSequence must match the first event.');
      }
      const snapshot = body.snapshot === undefined
        ? undefined
        : validateSnapshot(body.snapshot, identity, body.runId);
      if (!events.length && !snapshot) invalidSessionRequest('At least one event or a snapshot is required.');
      const headerVersion = request.headers.get('if-match');
      const bodyVersion = typeof body.expectedVersion === 'string' ? body.expectedVersion : undefined;
      const version = requireVersion(headerVersion ?? bodyVersion);
      const session = await getSessionService().appendAndSnapshot(
        identity, body.runId, events, snapshot, version,
      );
      return jsonWithSession(session);
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}
