import { Leaf } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// App bar (design system v2 — mock .appbar/.brandmark): leaf brandmark + title, sticky,
// translucent surface with backdrop-blur. Stays a server component.
export async function AppHeader() {
  const t = await getTranslations('common');
  return (
    <header className="sticky top-0 z-10 flex min-h-sb-tap items-center gap-2 border-b border-sb-border bg-sb-surface/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-sb-surface/85">
      <Leaf aria-hidden className="size-6 text-sb-brand" />
      <span className="text-sb-title text-sb-fg">{t('appName')}</span>
    </header>
  );
}
