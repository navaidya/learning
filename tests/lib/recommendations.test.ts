import { describe, expect, it } from 'vitest';
import { recommendTopics } from '../../src/lib/recommendations';

describe('recommendations', () => {
  it('ranks a critical weak topic first', () => {
    const result = recommendTopics([{ title: 'Mastered', status: 'mastered', coverage: 100, last_reviewed: '2026-08-08' }, { title: 'RBAC', importance: 'critical', coverage: 20 }], new Date('2026-08-10'), 2);
    expect(result[0].topic.title).toBe('RBAC');
  });
});
