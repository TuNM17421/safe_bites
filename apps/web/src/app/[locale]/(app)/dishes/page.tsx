import { setRequestLocale } from 'next-intl/server';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { DishGuide } from '@/features/dishes/dish-guide';

export default async function DishesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="flex flex-col gap-4">
      <SafetyNotice />
      <DishGuide />
    </div>
  );
}
