import { describe, expect, it } from 'vitest';
import { chatTranscriptSchema, type ChatMessage } from '../../lib/agent-schemas';
import { HISTORY_TURNS, messagesToHistory } from '../../features/agent/history';

const turn = (i: number, role: 'user' | 'bot'): ChatMessage => ({ id: `m${i}`, role, text: `msg ${i}` });

describe('messagesToHistory', () => {
  it('maps role/text and keeps only the last HISTORY_TURNS turns', () => {
    const msgs = Array.from({ length: 20 }, (_, i) => turn(i, i % 2 ? 'bot' : 'user'));
    const history = messagesToHistory(msgs);
    expect(history).toHaveLength(HISTORY_TURNS);
    expect(history[0]).toEqual({ role: msgs[20 - HISTORY_TURNS]!.role, text: msgs[20 - HISTORY_TURNS]!.text });
    expect(history.at(-1)).toEqual({ role: 'bot', text: 'msg 19' });
  });

  it('returns everything when under the cap', () => {
    expect(messagesToHistory([turn(0, 'user'), turn(1, 'bot')])).toEqual([
      { role: 'user', text: 'msg 0' },
      { role: 'bot', text: 'msg 1' },
    ]);
  });

  it('is empty for an empty transcript', () => {
    expect(messagesToHistory([])).toEqual([]);
  });
});

describe('chatTranscriptSchema', () => {
  it('accepts a valid transcript incl. proposalSent', () => {
    const ok = chatTranscriptSchema.safeParse([
      { id: 'a', role: 'user', text: 'hi' },
      { id: 'b', role: 'bot', text: 'hello', proposalSent: true },
    ]);
    expect(ok.success).toBe(true);
  });

  it('rejects a foreign/corrupt shape (decrypt boundary guard)', () => {
    expect(chatTranscriptSchema.safeParse([{ id: 1, role: 'admin' }]).success).toBe(false);
    expect(chatTranscriptSchema.safeParse('not-an-array').success).toBe(false);
  });
});
