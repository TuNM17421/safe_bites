'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { decideRedirect } from '@/lib/auth/route-gate';
import { useProfileStore } from '@/lib/profile-store';

// Single owner of first-run + lock gating. On mount it runs the cheap `probe()` (does an encrypted
// profile exist?), then applies the pure `decideRedirect` decision: locked profile → /login,
// no profile on a profile-required route → /onboarding. When unlocked with a profile on disk it
// hydrates (decrypts) it into the store for synchronous reads elsewhere.
export function ProfileHydrator() {
  const probe = useProfileStore((s) => s.probe);
  const probed = useProfileStore((s) => s.probed);
  const hasProfileOnDisk = useProfileStore((s) => s.hasProfileOnDisk);
  const unlocked = useProfileStore((s) => s.unlocked);
  const profile = useProfileStore((s) => s.profile);
  const hydrate = useProfileStore((s) => s.hydrate);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void probe();
  }, [probe]);

  useEffect(() => {
    const target = decideRedirect({ probed, hasProfileOnDisk, unlocked, pathname });
    if (target) {
      router.replace(target);
      return;
    }
    // Passed the gate while unlocked but not yet in memory → decrypt into the store.
    if (probed && hasProfileOnDisk && unlocked && !profile) void hydrate();
  }, [probed, hasProfileOnDisk, unlocked, profile, pathname, router, hydrate]);

  return null;
}
