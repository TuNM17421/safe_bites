'use client';
import { Bot, Camera, CircleUser, Flame, Map } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

// Mobile bottom navigation — v2: exactly 5 top-level DESTINATIONS (Material 3 / iOS HIG: 3–5 max).
// Map · Assistant · OCR · Famous · Profile. Actions/utilities live elsewhere, per
// destination-vs-action: the allergy card is now folded into /profile, and "create question
// for owner" is a contextual CTA on the restaurant dish detail. `Map` (folded map) is used for
// the tab so `MapPin` stays reserved for pins on the map itself.
const TABS = [
  { href: '/home', key: 'map', Icon: Map },
  { href: '/agent', key: 'agent', Icon: Bot },
  { href: '/ocr', key: 'ocr', Icon: Camera },
  { href: '/famous', key: 'famous', Icon: Flame },
  { href: '/profile', key: 'profile', Icon: CircleUser },
] as const;

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
            className="flex min-h-sb-tap flex-col items-center justify-center gap-0.5 py-2 text-xs focus-visible:shadow-sb-focus"
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
