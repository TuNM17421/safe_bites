'use client';
import { create } from 'zustand';
import type { ChatMessage } from '@/lib/agent-schemas';
import { chatRepo } from './chat-repo';

// App-wide agent-chat store. As a module singleton it survives in-app navigation (the reported
// bug: switching tabs unmounted the component and lost React state). Holds ONLY real turns — the
// welcome bubble is rendered from i18n, never persisted, so its locale/text stays fresh.
interface AgentChatState {
  messages: ChatMessage[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  append: (messages: ChatMessage[]) => void;
  markProposalSent: (id: string) => void;
  reset: () => Promise<void>;
}

// Persist fire-and-forget: the store is the live source of truth; Dexie is the durable backing.
const persist = (messages: ChatMessage[]): void => {
  void chatRepo.save(messages);
};

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
  messages: [],
  hydrated: false,
  // Load the encrypted transcript once. Subsequent mounts (tab switches) keep the in-memory copy.
  async hydrate() {
    if (get().hydrated) return;
    set({ messages: await chatRepo.load(), hydrated: true });
  },
  append(newMsgs) {
    const messages = [...get().messages, ...newMsgs];
    set({ messages });
    persist(messages);
  },
  // Collapse a proposal card after it's submitted so a restored transcript can't re-send it.
  markProposalSent(id) {
    const messages = get().messages.map((m) => (m.id === id ? { ...m, proposalSent: true } : m));
    set({ messages });
    persist(messages);
  },
  async reset() {
    set({ messages: [] });
    await chatRepo.clear();
  },
}));
