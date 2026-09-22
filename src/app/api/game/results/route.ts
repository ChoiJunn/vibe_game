import type { TerminalRunStatus } from '@/server/cosmos/models';
import { invalidSessionRequest, readJson, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';
import { getResultService, ResultSubmissionError, RunValidationError } from '@/server/game/resultService';

export const runtime = 'nodejs';

const TERMINAL_STATUSES: readonly string[] = ['completed', 'failed', 'abandoned'];

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const body = await readJson(request);
      if (typeof body.runId !== 'string' || !body.runId) invalidSessionRequest('runId is required.');
      if (typeof body.terminalStatus !== 'string' || !TERMINAL_STATUSES.includes(body.terminalStatus)) {
        invalidSessionRequest('A valid terminalStatus is required.');
      }
      const submitted = await getResultService().submitResult(identity, {
        runId: body.runId,
        terminalStatus: body.terminalStatus as TerminalRunStatus,
        claimedSnapshot: body.claimedSnapshot,
        confirmed: body.confirmed === true,
        expectedVersion: request.headers.get('if-match') ??
          (typeof body.expectedVersion === 'string' ? body.expectedVersion : undefined),
      });
      return Response.json(submitted, {
        status: submitted.created ? 201 : 200,
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      if (error instanceof RunValidationError) {
        console.warn(JSON.stringify({ event: 'rhythm_result_rejected', reason: error.reason }));
        return Response.json({ error: error.message, code: error.reason }, { status: 422 });
      }
      if (error instanceof ResultSubmissionError) {
        return Response.json({ error: error.message }, { status: error.statusCode });
      }
      return sessionErrorResponse(error);
    }
  });
}
