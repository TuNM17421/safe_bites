import 'server-only';
import { getOpenAi } from '@/lib/openai';

// Content-safety guardrail (OpenAI Moderation). Flags abusive/harmful text before it reaches the
// model and before model output reaches the user. Fails OPEN on a transient moderation error — a
// moderation outage must not block a legitimate allergy question — but any positive flag is honored.
export async function isFlaggedContent(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    const res = await getOpenAi().moderations.create({ model: 'omni-moderation-latest', input: text });
    return res.results[0]?.flagged ?? false;
  } catch {
    return false;
  }
}
