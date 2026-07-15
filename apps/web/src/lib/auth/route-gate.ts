// Pure first-run + lock gating (Phase 14). Kept dependency-free so the redirect decision is unit
// tested in isolation. ProfileHydrator is the single owner that applies the result.

// v2 profile-dependent destinations: personalized safety views meaningless without allergens on
// file. Demoted v1 routes (/dishes, /allergy-card, /question-card) are intentionally excluded.
// Matching is exact or `${p}/…`, so '/restaurant' gates '/restaurant/:id[/dish]' but not the
// (removed) plural '/restaurants' list.
export const PROFILE_REQUIRED = ['/agent', '/ocr', '/famous', '/restaurant'];

// The two auth surfaces gate the rest but must never redirect onto themselves (loop guard).
export const AUTH_EXEMPT = ['/login', '/onboarding'];

const matches = (pathname: string, routes: string[]): boolean =>
  routes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export interface GateState {
  probed: boolean;
  hasProfileOnDisk: boolean;
  unlocked: boolean;
  pathname: string;
}

// Ordered checks: (1) wait for the cheap probe; (2) never gate the auth surfaces themselves;
// (3) a profile exists but the session is locked → /login; (4) no profile and this route needs one
// → /onboarding. Otherwise pass through.
export function decideRedirect(s: GateState): '/login' | '/onboarding' | null {
  if (!s.probed) return null;
  if (matches(s.pathname, AUTH_EXEMPT)) return null;
  if (s.hasProfileOnDisk && !s.unlocked) return '/login';
  if (!s.hasProfileOnDisk && matches(s.pathname, PROFILE_REQUIRED)) return '/onboarding';
  return null;
}
