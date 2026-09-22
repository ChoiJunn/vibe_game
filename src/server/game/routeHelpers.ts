import 'server-only';

import { AuthenticationError, authenticateGameRequest } from './authenticateRequest';
import { getServiceErrorStatus } from './sessionService';

export function jsonWithSession<T extends { _etag: string }>(session: T, status = 200): Response {
  const { _etag, ...body } = session;
  return Response.json({ session: body, version: _etag }, { status, headers: { ETag: _etag, 'Cache-Control': 'no-store' } });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('A JSON object is required.');
  return value as Record<string, unknown>;
}

export function sessionErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: 'Authentication required.', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const status = getServiceErrorStatus(error);
  const allowedStatus = status >= 400 && status < 500 ? status : 500;
  const code = allowedStatus === 412 ? 'SESSION_VERSION_CONFLICT' : allowedStatus === 404 ? 'SESSION_NOT_FOUND' : allowedStatus === 409 ? 'ACTIVE_SESSION_CONFLICT' : allowedStatus === 400 ? 'INVALID_SESSION_REQUEST' : 'SESSION_SERVICE_ERROR';
  const message = allowedStatus === 412
    ? 'Session changed in another tab. Fetch the latest saved state before continuing.'
    : allowedStatus === 404
      ? 'No active game session was found.'
      : allowedStatus === 400
        ? (error instanceof Error ? error.message : 'Invalid request.')
        : 'The game session could not be processed.';
  return Response.json({ error: message, code }, { status: allowedStatus, headers: { 'Cache-Control': 'no-store' } });
}

export async function withGameIdentity(
  request: Request,
  handler: (identity: Awaited<ReturnType<typeof authenticateGameRequest>>) => Promise<Response>,
): Promise<Response> {
  try {
    return await handler(await authenticateGameRequest(request));
  } catch (error) {
    return sessionErrorResponse(error);
  }
}
