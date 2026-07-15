'use client';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { BotRestaurantCard } from '@/components/agent/bot-restaurant-card';
import { ChatBubble } from '@/components/agent/chat-bubble';
import { DataEditProposalCard } from '@/components/agent/data-edit-proposal-card';
import { useProfileStore } from '@/lib/profile-store';
import type { ChatMessage } from './agent-types';
import { useAgentChat } from './use-agent-chat';

let seq = 0;
const nextId = () => `m${(seq += 1)}`;

// /agent chat orchestrator. Scripted, offline-tolerant. The transcript scrolls; the composer is
// pinned. Bot replies may attach a real restaurant card or a HITL data-edit proposal.
export function AgentChat() {
  const t = useTranslations('agent');
  const locale = useLocale();
  const lang = locale === 'vi' ? 'vi' : 'en';
  const profile = useProfileStore((s) => s.profile);
  const { send, sending } = useAgentChat();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'bot', text: t('welcome') },
  ]);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setDraft('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);

    const reply = await send({
      message,
      allergenIds: profile?.allergies.map((a) => a.allergenId) ?? [],
      city: profile?.destinationCity ?? 'hanoi',
      locale: lang,
    });

    setMessages((prev) => [
      ...prev,
      reply
        ? {
            id: nextId(),
            role: 'bot',
            text: reply.text[lang],
            restaurant: reply.restaurant,
            proposal: reply.proposal,
          }
        : { id: nextId(), role: 'bot', text: t('error') },
    ]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} text={m.text}>
            {m.restaurant ? <BotRestaurantCard restaurant={m.restaurant} lang={lang} /> : null}
            {m.proposal ? <DataEditProposalCard proposal={m.proposal} lang={lang} /> : null}
          </ChatBubble>
        ))}
        {sending ? <p className="text-sb-caption text-sb-faint">{t('thinking')}</p> : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-sb-border bg-sb-surface p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSubmit(e);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="min-h-sb-tap max-h-32 flex-1 resize-none rounded-sb-md border border-sb-border bg-sb-surface px-3 py-2 text-sb-body-s text-sb-fg outline-none focus-visible:shadow-sb-focus"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label={t('send')}
            className="grid min-h-sb-tap min-w-sb-tap place-items-center rounded-sb-md bg-sb-primary text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus"
          >
            <Send aria-hidden className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
