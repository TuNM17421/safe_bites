import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// In-app offline route (rendered when the shell is loaded). The SW navigation fallback
// is the static /offline.html instead, so this never causes a redirect loop.
export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('offline');
  const linkBtn = 'rounded-sb-md border border-sb-border px-4 py-3 font-medium text-sb-fg focus-visible:shadow-sb-focus';
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-xl font-bold text-sb-fg">{t('title')}</h1>
      <p className="text-sb-muted">{t('notice')}</p>
      <div className="flex flex-col gap-2">
        <Link href="/profile" className={linkBtn}>
          {t('savedAllergyCard')}
        </Link>
        <Link href="/question-card" className={linkBtn}>
          {t('lastQuestionCard')}
        </Link>
        <Link
          href="/home"
          className="rounded-sb-md bg-sb-primary px-4 py-3 text-center font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
          {t('retry')}
        </Link>
      </div>
    </main>
  );
}
