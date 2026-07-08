'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useProfileStore } from '@/lib/profile-store';

const PROFILE_REQUIRED = ['/dishes', '/allergy-card', '/question-card'];

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
