'use client';
import { useState } from 'react';
import { agentReplySchema, type AgentReply } from '@/lib/agent-schemas';

export function useAgentChat() {
  const [sending, setSending] = useState(false);

  async function send(body: {
    message: string;
    allergenIds: string[];
    city: string;
    locale: 'en' | 'vi';
  }): Promise<AgentReply | null> {
    setSending(true);
    try {
      const res = await fetch('/api/v1/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return agentReplySchema.parse(((await res.json()) as { data: unknown }).data);
    } catch {
      return null;
    } finally {
      setSending(false);
    }
  }

  return { send, sending };
}
