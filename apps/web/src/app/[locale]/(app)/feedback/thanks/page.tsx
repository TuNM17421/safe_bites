import { setRequestLocale } from 'next-intl/server';
import { FeedbackSuccessPanel } from '@/components/feedback/feedback-success-panel';

export default async function FeedbackThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FeedbackSuccessPanel />;
}
