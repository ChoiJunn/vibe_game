export const ENTRA_SCOPES = ['openid', 'profile', 'email'] as const;

type EntraConfigInput = {
  clientId?: string;
  tenantId?: string;
  redirectUri?: string;
};

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes('<') || value.includes('>') || value.startsWith('your-');
}

export function isValidEntraConfig(
  { clientId, tenantId, redirectUri }: EntraConfigInput,
  production = process.env.NODE_ENV === 'production',
): boolean {
  if (isPlaceholder(clientId) || isPlaceholder(tenantId) || isPlaceholder(redirectUri)) {
    return false;
  }

  if (!production) {
    return true;
  }

  try {
    const url = new URL(redirectUri!);
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    return url.protocol === 'https:' && !loopbackHosts.has(url.hostname);
  } catch {
    return false;
  }
}

const clientId = process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID?.trim();
const tenantId = process.env.NEXT_PUBLIC_ENTRA_TENANT_ID?.trim();
const redirectUri = process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI?.trim();

export const entraAuthConfig = {
  clientId: clientId ?? '',
  tenantId: tenantId ?? '',
  authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : '',
  redirectUri: redirectUri ?? '',
  scopes: ENTRA_SCOPES,
  isConfigured: isValidEntraConfig({ clientId, tenantId, redirectUri }),
} as const;
