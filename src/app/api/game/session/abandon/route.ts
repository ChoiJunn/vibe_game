import { invalidSessionRequest, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getResultService, ResultSubmissionError } from '@/server/game/resultService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (body.confirmed !== true) invalidSessionRequest('Explicit confirmation is required to abandon a run.');
      if (typeof body.runId !== 'string' || !body.runId) invalidSessionRequest('runId is required.');
      const suppliedVersion = request.headers.get('if-match') ??
        (typeof body.expectedVersion === 'string' ? body.expectedVersion : '');
      const expectedVersion = suppliedVersion.replaceAll(String.fromCharCode(34), '');
      if (!expectedVersion) invalidSessionRequest('A current session version is required.');
      const submitted = await getResultService().submitResult(identity, {
        runId: body.runId,
        terminalStatus: 'abandoned',
        confirmed: true,
        expectedVersion,
      });
      return Response.json(submitted, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof ResultSubmissionError) {
        return Response.json({ error: error.message }, { status: error.statusCode });
      }
      return sessionErrorResponse(error);
    }
  });
}
