import { setRequestLocale } from 'next-intl/server';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { QuestionCardScreen } from '@/features/question-card/question-card-screen';

export default async function QuestionCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dishId?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { dishId } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <SafetyNotice />
      <QuestionCardScreen dishId={dishId} />
    </div>
  );
}
