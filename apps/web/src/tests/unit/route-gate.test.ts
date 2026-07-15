import { describe, expect, it } from 'vitest';
import { decideRedirect } from '../../lib/auth/route-gate';

const base = { probed: true, hasProfileOnDisk: false, unlocked: false, pathname: '/home' };

describe('decideRedirect', () => {
  it('waits for the probe before deciding', () => {
    expect(decideRedirect({ ...base, probed: false, hasProfileOnDisk: true })).toBeNull();
  });

  it('sends a locked profile to /login from any non-exempt route', () => {
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, pathname: '/home' })).toBe('/login');
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, pathname: '/famous' })).toBe('/login');
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, pathname: '/restaurant/abc/dish' })).toBe('/login');
  });

  it('never redirects the auth surfaces themselves (loop guard)', () => {
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, pathname: '/login' })).toBeNull();
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, pathname: '/onboarding' })).toBeNull();
  });

  it('lets an unlocked profile pass through', () => {
    expect(decideRedirect({ ...base, hasProfileOnDisk: true, unlocked: true, pathname: '/home' })).toBeNull();
  });

  it('sends a first-run user to /onboarding only on profile-required routes', () => {
    expect(decideRedirect({ ...base, pathname: '/agent' })).toBe('/onboarding');
    expect(decideRedirect({ ...base, pathname: '/restaurant/abc' })).toBe('/onboarding');
    // /home and /profile handle their own no-profile empty state — not forced to onboard.
    expect(decideRedirect({ ...base, pathname: '/home' })).toBeNull();
    expect(decideRedirect({ ...base, pathname: '/profile' })).toBeNull();
  });

  it('does not confuse the removed /restaurants list with /restaurant', () => {
    expect(decideRedirect({ ...base, pathname: '/restaurants' })).toBeNull();
  });
});
