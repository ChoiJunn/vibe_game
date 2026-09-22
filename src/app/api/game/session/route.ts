import { getSessionService } from '@/server/game/sessionService';
import { jsonWithSession, sessionErrorResponse, withGameIdentity } from '@/server/game/routeHelpers';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const session = await getSessionService().getActive(identity);
      return session
        ? jsonWithSession(session)
        : Response.json({ session: null }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  return withGameIdentity(request, async (identity) => {
    try {
      const result = await getSessionService().createOrGet(identity);
      return jsonWithSession(result.session, result.created ? 201 : 200);
    } catch (error) {
      return sessionErrorResponse(error);
    }
  });
}
