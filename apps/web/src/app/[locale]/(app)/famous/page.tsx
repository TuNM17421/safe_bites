import { setRequestLocale } from 'next-intl/server';
import { ScaffoldScreen } from '@/components/common/scaffold-screen';

// v2 /famous — famous local dishes (Phase 08). Scaffold only.
export default async function FamousPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ScaffoldScreen titleKey="nav.famous" />;
}
