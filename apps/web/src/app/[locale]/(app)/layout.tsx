import { ViewTransition, type ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AppHeader } from '@/components/app-shell/app-header';
import { BottomNav } from '@/components/app-shell/bottom-nav';
import { InstallEducationCard } from '@/components/app-shell/install-education-card';
import { OfflineBanner } from '@/components/app-shell/offline-banner';
import { ProfileHydrator } from '@/components/app-shell/profile-hydrator';

// Persistent mobile app shell for all in-app routes (§13).
export default async function AppShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <ProfileHydrator />
      <AppHeader />
      <OfflineBanner />
      <main className="flex-1 px-4 py-4">
        <ViewTransition>{children}</ViewTransition>
      </main>
      <InstallEducationCard />
      <BottomNav />
    </div>
  );
}
