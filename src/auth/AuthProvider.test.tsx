import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from './AuthProvider';

describe('AuthProvider errors', () => {
  it('explains missing Entra configuration without exposing secrets', () => {
    const message = getAuthErrorMessage();

    expect(message).toContain('Entra ID');
    expect(message).not.toContain('client-id');
    expect(message).not.toContain('tenant-id');
  });
});
