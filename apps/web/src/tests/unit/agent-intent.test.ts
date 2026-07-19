import { describe, expect, it } from 'vitest';
import { detectAgentIntent } from '../../server/agent/agent-intent';

describe('detectAgentIntent', () => {
  it('routes ingredient + verb messages to report (EN + VI)', () => {
    expect(detectAgentIntent('Does this dish contain peanut?')).toBe('report');
    expect(detectAgentIntent('Món này có chiên bằng dầu không?')).toBe('report');
    expect(detectAgentIntent('they add peanut oil')).toBe('report');
  });

  it('routes suggestion asks to suggest when no ingredient+verb pair', () => {
    expect(detectAgentIntent('Suggest something nearby')).toBe('suggest');
    expect(detectAgentIntent('gợi ý món gần đây')).toBe('suggest');
    expect(detectAgentIntent('what can I eat here?')).toBe('suggest');
  });

  it('prefers report over suggest when both signals are present', () => {
    // "món" is a suggest keyword but ingredient+verb wins.
    expect(detectAgentIntent('món này có dùng đậu phộng')).toBe('report');
  });

  it('falls back when neither pattern matches', () => {
    expect(detectAgentIntent('hello')).toBe('fallback');
    expect(detectAgentIntent('thanks!')).toBe('fallback');
  });

  it('is case-insensitive', () => {
    expect(detectAgentIntent('CONTAIN PEANUT')).toBe('report');
  });
});
