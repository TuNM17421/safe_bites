'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/home', key: 'home', icon: '🏠' },
  { href: '/dishes', key: 'dishes', icon: '🍜' },
  { href: '/allergy-card', key: 'allergyCard', icon: '🪪' },
  { href: '/question-card', key: 'questionCard', icon: '💬' },
  { href: '/profile', key: 'profile', icon: '👤' },
] as const;

// Mobile bottom navigation. Locale-aware links via @/i18n/navigation; no restaurant tab
// (OSM data is discovery-only and hidden in Phase 1).
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-border bg-background">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <span aria-hidden className="text-lg">
              {tab.icon}
            </span>
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
