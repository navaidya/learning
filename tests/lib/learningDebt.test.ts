import { describe, expect, it } from 'vitest';
import { calculateLearningDebt } from '../../src/lib/learningDebt';

describe('learning debt', () => {
  it('marks a stale critical topic as critical', () => {
    const debt = calculateLearningDebt({ title: 'RBAC', importance: 'critical', last_reviewed: '2026-06-01', confidence: 2 }, { score: 40, availableMetrics: [], quizPerformance: 52 }, new Date('2026-08-10'));
    expect(debt.severity).toBe('critical');
  });
});
