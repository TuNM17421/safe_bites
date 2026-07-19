// Pure, dependency-free intent detection for the scripted agent. Kept separate from
// script-agent-reply (which imports prisma) so it can be unit-tested in isolation. Bilingual
// keyword sets keep detection language-agnostic. This is the single swap point for a real LLM.

const SUGGEST_KW = ['suggest', 'recommend', 'gợi ý', 'goi y', 'tìm', 'tim', 'món', 'mon', 'nearby', 'gần', 'gan', 'eat', 'ăn'];
const INGREDIENT_KW = ['peanut', 'đậu phộng', 'dau phong', 'dầu', 'dau', 'oil', 'sốt', 'sot'];
const VERB_KW = ['contain', 'use', 'dùng', 'dung', 'có', 'thêm', 'them', 'add', 'fried', 'chiên', 'chien'];

const has = (msg: string, kws: string[]): boolean => kws.some((k) => msg.includes(k));

export type AgentIntent = 'report' | 'suggest' | 'fallback';

// Which canned branch a message takes. Ingredient+verb → data-edit report; otherwise a suggest
// keyword → nearby suggestion; else a fallback prompt.
export function detectAgentIntent(message: string): AgentIntent {
  const msg = message.toLowerCase();
  if (has(msg, INGREDIENT_KW) && has(msg, VERB_KW)) return 'report';
  if (has(msg, SUGGEST_KW)) return 'suggest';
  return 'fallback';
}
