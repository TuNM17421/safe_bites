'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

// v2 profile-dependent destinations: personalized safety views that are meaningless
// without allergens on file. The demoted v1 routes (/dishes, /allergy-card, /question-card)
// are intentionally excluded. Matching is exact or `${p}/…`, so '/restaurant' gates
// '/restaurant/:id[/dish]' but not the (soon-removed) plural '/restaurants' list.
const PROFILE_REQUIRED = ['/agent', '/ocr', '/famous', '/restaurant'];

// Hydrates the profile store from Dexie on mount and, once hydrated, redirects
// profile-required routes to /onboarding when there is no local profile. /home and
// /profile handle the no-profile state themselves.
export function ProfileHydrator() {
  const hydrate = useProfileStore((s) => s.hydrate);
  const hydrated = useProfileStore((s) => s.hydrated);
  const profile = useProfileStore((s) => s.profile);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || profile) return;
    if (PROFILE_REQUIRED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      router.replace('/onboarding');
    }
  }, [hydrated, profile, pathname, router]);

  return null;
}
