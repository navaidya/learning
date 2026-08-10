import { describe, expect, it } from 'vitest';

describe('progress calculation', () => {
  it('calculates coverage when optional metrics are unavailable', async () => {
    const { calculateTopicProgress } = await import('../../src/lib/progress');
    expect(calculateTopicProgress({ coverage: 50 }, new Date('2026-08-10')).score).toBe(50);
  });
});
