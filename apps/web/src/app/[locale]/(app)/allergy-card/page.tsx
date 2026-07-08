import { setRequestLocale } from 'next-intl/server';
import { AllergyCardDisplay } from '@/features/allergy-card/allergy-card-display';

export default async function AllergyCardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AllergyCardDisplay />;
}
