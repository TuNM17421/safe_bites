import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { Link } from '@/i18n/navigation';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tCommon = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-sb-muted">{tCommon('appName')}</p>
        <h1 className="text-3xl font-bold text-sb-fg sm:text-4xl">{t('tagline')}</h1>
        <p className="text-base text-sb-muted">{t('positioning')}</p>
        <p className="text-sm text-sb-muted">{t('noInstall')}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="rounded-sb-md bg-sb-primary px-5 py-3 text-center font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
          {t('startProfile')}
        </Link>
        <Link
          href="/dishes"
          className="rounded-sb-md border border-sb-border px-5 py-3 text-center font-semibold text-sb-fg focus-visible:shadow-sb-focus"
        >
          {t('browseDishes')}
        </Link>
      </div>

      <SafetyNotice />
    </main>
  );
}
