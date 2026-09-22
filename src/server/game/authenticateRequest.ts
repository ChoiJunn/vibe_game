import 'server-only';

import { createRemoteJWKSet, jwtVerify } from 'jose';

export type GameIdentity = { oid: string; tenantId: string };

export class AuthenticationError extends Error {
  constructor(message = 'A valid Entra ID sign-in token is required.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

const jwksByTenant = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function authenticateGameRequest(request: Request): Promise<GameIdentity> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const expectedTenant = process.env.NEXT_PUBLIC_ENTRA_TENANT_ID?.trim();
  const audience = process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID?.trim();
  if (!token || !expectedTenant || !audience) throw new AuthenticationError();

  try {
    const jwks = jwksByTenant.get(expectedTenant) ?? createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${expectedTenant}/discovery/v2.0/keys`),
    );
    jwksByTenant.set(expectedTenant, jwks);
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ['RS256'],
      audience,
      issuer: `https://login.microsoftonline.com/${expectedTenant}/v2.0`,
      clockTolerance: 5,
    });
    if (payload.tid !== expectedTenant || typeof payload.oid !== 'string' || !payload.oid) {
      throw new AuthenticationError();
    }
    return { oid: payload.oid, tenantId: expectedTenant };
  } catch {
    throw new AuthenticationError();
  }
}
