import { describe, expect, it } from 'vitest';
import {
  ADMIN_COOKIE,
  adminCookie,
  clearedAdminCookie,
  computeAdminDigest,
  constantTimeEqual,
  readCookie,
  verifyAdminCookie,
} from '../../lib/admin-auth';

describe('admin-auth', () => {
  it('computeAdminDigest is a deterministic 64-char hex SHA-256', async () => {
    const a = await computeAdminDigest('secret');
    expect(a).toBe(await computeAdminDigest('secret'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await computeAdminDigest('other')).not.toBe(a);
  });

  it('constantTimeEqual compares by value and length', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
  });

  it('cookie is httpOnly + SameSite=Strict; cleared cookie expires immediately', () => {
    const c = adminCookie('digest');
    expect(c.name).toBe(ADMIN_COOKIE);
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe('strict');
    expect(c.value).toBe('digest');
    expect(c.maxAge).toBeGreaterThan(0);
    expect(clearedAdminCookie().maxAge).toBe(0);
  });

  it('verifyAdminCookie accepts only the digest of ADMIN_TOKEN', async () => {
    process.env.ADMIN_TOKEN = 'test-token';
    expect(await verifyAdminCookie(await computeAdminDigest('test-token'))).toBe(true);
    expect(await verifyAdminCookie('not-the-digest')).toBe(false);
    expect(await verifyAdminCookie(undefined)).toBe(false);
  });

  it('readCookie extracts a named cookie from the request header', () => {
    const req = new Request('http://x/', { headers: { cookie: `a=1; ${ADMIN_COOKIE}=xyz; b=2` } });
    expect(readCookie(req, ADMIN_COOKIE)).toBe('xyz');
    expect(readCookie(new Request('http://x/'), ADMIN_COOKIE)).toBeUndefined();
  });
});
