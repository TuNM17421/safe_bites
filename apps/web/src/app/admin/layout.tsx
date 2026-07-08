'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { adminMessages } from './admin-messages';
import { AdminLogout } from './logout-button';

// Admin shell: fixed-locale intl island (locale="en") + its own TanStack Query client
// (the /admin tree is outside the public (app) providers). Deliberately uses next/link +
// next/navigation, NOT @/i18n/navigation, so admin URLs are never locale-prefixed (phase-12 ADR).
const NAV = [
  { href: '/admin', key: 'dashboard' },
  { href: '/admin/dishes', key: 'dishes' },
  { href: '/admin/ingredients', key: 'ingredients' },
  { href: '/admin/dish-risks', key: 'dishRisks' },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  return (
    <NextIntlClientProvider locale="en" messages={{ admin: adminMessages }}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-dvh bg-sb-bg text-sb-fg">
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
          <main className="mx-auto max-w-5xl p-4">{children}</main>
        </div>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
