import { setRequestLocale } from 'next-intl/server';
import { FeedbackSuccessPanel } from '@/components/feedback/feedback-success-panel';

export default async function FeedbackThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ queued?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { queued } = await searchParams;
  return <FeedbackSuccessPanel queued={queued === '1'} />;
}
