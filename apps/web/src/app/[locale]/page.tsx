import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tSafety = await getTranslations('safety');
  const tCommon = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {tCommon('appName')}
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">{t('tagline')}</h1>
        <p className="text-base text-muted-foreground">{t('positioning')}</p>
        <p className="text-sm text-muted-foreground">{t('noInstall')}</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/onboarding"
          className="rounded-lg bg-foreground px-5 py-3 text-center font-semibold text-background"
        >
          {t('startProfile')}
        </Link>
        <Link
          href="/dishes"
          className="rounded-lg border border-border px-5 py-3 text-center font-semibold text-foreground"
        >
          {t('browseDishes')}
        </Link>
      </div>

      <p
        role="note"
        className="rounded-lg border border-border bg-safety p-4 text-sm text-safety-foreground"
      >
        {tSafety('disclaimer')}
      </p>
    </main>
  );
}
