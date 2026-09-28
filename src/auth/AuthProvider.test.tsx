import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from './AuthProvider';

describe('AuthProvider errors', () => {
  it('explains missing Entra configuration without exposing secrets', () => {
    const message = getAuthErrorMessage(false);

    expect(message).toContain('Entra ID');
    expect(message).not.toContain('client-id');
    expect(message).not.toContain('tenant-id');
  });

  it('uses the generic login error when Entra configuration is present', () => {
    expect(getAuthErrorMessage(true)).not.toContain('Entra ID');
  });
});
