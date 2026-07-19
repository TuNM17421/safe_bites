import { setRequestLocale } from 'next-intl/server';
import { AgentChat } from '@/features/agent/agent-chat';

// v2 /agent — scripted chat assistant (Phase 13). RSC shell; the chat itself is client-side.
export default async function AgentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AgentChat />;
}
