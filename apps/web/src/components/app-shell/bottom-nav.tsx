'use client';
import { CircleUser, House, IdCard, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { href: '/home', key: 'home', Icon: House },
  { href: '/dishes', key: 'dishes', Icon: UtensilsCrossed },
  { href: '/allergy-card', key: 'allergyCard', Icon: IdCard },
  { href: '/question-card', key: 'questionCard', Icon: MessageCircle },
  { href: '/profile', key: 'profile', Icon: CircleUser },
] as const;

// Mobile bottom navigation. Locale-aware links via @/i18n/navigation; no restaurant tab
// (OSM data is discovery-only and hidden in Phase 1).
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-sb-border bg-sb-surface/90 shadow-sb-e2 backdrop-blur supports-[backdrop-filter]:bg-sb-surface/90 pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ href, key, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-2 text-xs focus-visible:shadow-sb-focus"
          >
            <span className={`flex items-center rounded-full px-3 py-0.5 ${active ? 'bg-sb-brand-soft text-sb-brand' : 'text-sb-muted'}`}>
              <Icon aria-hidden className="size-5" />
            </span>
            <span className={active ? 'text-sb-brand' : 'text-sb-muted'}>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
