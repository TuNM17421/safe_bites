'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { adminMessages } from './admin-messages';
import { AdminLogout } from './logout-button';

// Interactive admin shell: fixed-locale intl island (locale="en") + its own TanStack Query client
// (the /admin tree is outside the public (app) providers). Deliberately uses next/link +
// next/navigation, NOT @/i18n/navigation, so admin URLs are never locale-prefixed (phase-12 ADR).
// v2 admin nav = 4 destinations. The dashboard + dish/ingredient/dish-risk CRUD pages stay
// reachable by direct URL but are demoted off the nav. Lives in a client component so the root
// layout (admin/layout.tsx) can stay a server component that renders <html>/<body>.
const NAV = [
  { href: '/admin/restaurants', key: 'restaurants' },
  { href: '/admin/import', key: 'import' },
  { href: '/admin/ocr-review', key: 'ocrReview' },
  { href: '/admin/reports', key: 'reports' },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  return (
    <NextIntlClientProvider locale="en" messages={{ admin: adminMessages }}>
      <QueryClientProvider client={queryClient}>
        {!isLogin ? (
          <header className="flex flex-wrap items-center gap-3 border-b border-sb-border bg-sb-surface px-4 py-3">
            <span className="font-extrabold">{adminMessages.title}</span>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-9 rounded-sb-sm px-3 py-1.5 hover:bg-sb-surface-2 ${
                    pathname === item.href ? 'font-bold text-sb-brand-ink' : 'text-sb-muted'
                  }`}
                >
                  {adminMessages.nav[item.key]}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <AdminLogout />
            </div>
          </header>
        ) : null}
        {/* Data-dense admin tables have many columns; a wider container keeps primary row actions
            (review / edit / delete) visible without horizontal scroll. */}
        <main className="mx-auto max-w-7xl p-4">{children}</main>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
