import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FeedbackForm } from '@/features/feedback/feedback-form';

export default async function FeedbackNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; menuItemId?: string; dishId?: string }>;
}) {
  const { locale } = await params;
  const { restaurantId, menuItemId, dishId } = await searchParams;
  setRequestLocale(locale);

  if (!restaurantId) {
    const t = await getTranslations('feedback');
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center p-6 text-center text-sb-body-s text-sb-muted">
        {t('form.fixErrors')}
      </div>
    );
  }

  return <FeedbackForm restaurantId={restaurantId} menuItemId={menuItemId} dishId={dishId} />;
}
