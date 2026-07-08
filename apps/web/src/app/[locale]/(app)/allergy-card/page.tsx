import { IdCard } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SavedBadge } from '@/components/status/source-badge';
import { AllergyCardDisplay } from '@/features/allergy-card/allergy-card-display';

export default async function AllergyCardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-sb-h1 text-sb-fg">
            <IdCard aria-hidden className="size-6" />
            {t('nav.allergyCard')}
          </h1>
          <SavedBadge label={t('allergyCard.offlineAvailable')} />
        </div>
        <p className="text-sb-body-s text-sb-muted">{t('allergyCard.showToStaff')}</p>
      </div>
      <AllergyCardDisplay />
    </div>
  );
}
