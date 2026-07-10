import { setRequestLocale } from 'next-intl/server';
import { ScaffoldScreen } from '@/components/common/scaffold-screen';

// v2 /agent — chat assistant (Phase 13). Scaffold only.
export default async function AgentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ScaffoldScreen titleKey="nav.agent" />;
}
