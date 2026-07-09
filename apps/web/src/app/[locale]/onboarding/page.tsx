import { setRequestLocale } from 'next-intl/server';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';

// Onboarding is a focused first-run flow — deliberately OUTSIDE the (app) route group so it
// renders without the persistent AppHeader/BottomNav. Full-height flex column so the wizard's
// bottom CTA anchors to the very bottom of the screen (replacing the removed bottom nav); the
// max-w-md + px-4 container makes the CTA's `-mx-4` bleed to the edges correctly.
export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4">
      <OnboardingWizard />
    </main>
  );
}
