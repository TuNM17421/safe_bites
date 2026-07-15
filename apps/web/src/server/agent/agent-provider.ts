import 'server-only';
import type { AgentReply } from '@/lib/agent-schemas';
import { isOpenAiEnabled } from '@/lib/openai';
import { openAiAgentReply } from './openai-agent';
import { scriptAgentReply } from './script-agent-reply';

export interface AgentInput {
  message: string;
  allergenIds: string[];
  city: string;
}

// The single dispatch the route calls. OpenAI when a key is configured; the deterministic scripted
// brain otherwise AND on ANY OpenAI failure (timeout, rate limit, bad output) — the chat never
// hard-fails and never blocks on the provider.
export async function getAgentReply(input: AgentInput): Promise<AgentReply> {
  if (!isOpenAiEnabled()) return scriptAgentReply(input);
  try {
    return await openAiAgentReply(input);
  } catch {
    return scriptAgentReply(input);
  }
}
