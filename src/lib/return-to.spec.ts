import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './return-to';

describe('safeReturnPath (#15)', () => {
  it('keeps same-site pages with their query', () => {
    expect(safeReturnPath('/ai-dashboard?program=NAS')).toBe('/ai-dashboard?program=NAS');
    expect(safeReturnPath('/workspaces/abc/mismatch/7177V36911')).toBe('/workspaces/abc/mismatch/7177V36911');
  });
  it('rejects other sites and malformed values', () => {
    expect(safeReturnPath('https://evil.example')).toBeNull();
    expect(safeReturnPath('//evil.example/x')).toBeNull();
    expect(safeReturnPath('/\\evil.example')).toBeNull();
    expect(safeReturnPath('')).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
  });
  it('never returns to an auth page or the root redirect', () => {
    expect(safeReturnPath('/login')).toBeNull();
    expect(safeReturnPath('/forgot-password?email=a%40b.c')).toBeNull();
    expect(safeReturnPath('/auth/callback?code=1')).toBeNull();
    expect(safeReturnPath('/')).toBeNull();
    expect(safeReturnPath('/login-help')).toBe('/login-help');
  });
});
