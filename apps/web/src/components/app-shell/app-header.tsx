import { IdCard, Leaf } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// App bar (mock .appbar/.brandmark): leaf brandmark + title, sticky, translucent + blur.
// Right side carries a persistent quick-access to the allergy card — a fast "show staff my
// card" action available from every screen without spending a bottom-nav slot (tab bar stays
// destinations-only; this action lives in the top bar, per Material/HIG).
export async function AppHeader() {
  const t = await getTranslations();
  return (
    <header className="sticky top-0 z-10 flex min-h-sb-tap items-center gap-2 border-b border-sb-border bg-sb-surface/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-sb-surface/85">
      <Leaf aria-hidden className="size-6 text-sb-brand" />
      <span className="text-sb-title text-sb-fg">{t('common.appName')}</span>
      <Link
        href="/profile"
        aria-label={t('nav.allergyCard')}
        className="ml-auto grid size-11 place-items-center rounded-full text-sb-muted hover:bg-sb-surface-2 hover:text-sb-brand focus-visible:shadow-sb-focus"
      >
        <IdCard aria-hidden className="size-6" />
      </Link>
    </header>
  );
}
