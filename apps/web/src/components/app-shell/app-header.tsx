import { getTranslations } from 'next-intl/server';

export async function AppHeader() {
  const t = await getTranslations('common');
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
      <p className="text-sm font-semibold">{t('appName')}</p>
    </header>
  );
}
