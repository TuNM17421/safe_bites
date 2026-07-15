import type { BotRestaurant, DataEditProposal } from '@/lib/agent-schemas';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  restaurant?: BotRestaurant | null;
  proposal?: DataEditProposal | null;
}
