import { setRequestLocale } from 'next-intl/server';
import { DishGuide } from '@/features/dishes/dish-guide';

// The single in-guide Shield reminder (rendered by DishGuide after the filter chips) carries
// the "always confirm with staff" message, matching the mock's single-notice dishes screen.
export default async function DishesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DishGuide />;
}
