import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

// In-app offline route (rendered when the shell is loaded). The SW navigation fallback
// is the static /offline.html instead, so this never causes a redirect loop.
export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('offline');
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('notice')}</p>
      <div className="flex flex-col gap-2">
        <Link href="/allergy-card" className="rounded-lg border border-border px-4 py-3 font-medium">
          {t('savedAllergyCard')}
        </Link>
        <Link href="/question-card" className="rounded-lg border border-border px-4 py-3 font-medium">
          {t('lastQuestionCard')}
        </Link>
        <Link href="/home" className="rounded-lg bg-foreground px-4 py-3 text-center font-semibold text-background">
          {t('retry')}
        </Link>
      </div>
    </main>
  );
}
