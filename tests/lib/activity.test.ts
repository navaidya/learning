import { describe, expect, it } from 'vitest';
import { calculateStreak } from '../../src/lib/activity';

describe('activity', () => {
  it('calculates consecutive calendar-day streaks', () => {
    expect(calculateStreak([{ date: '2026-08-10', type: 'learning' }, { date: '2026-08-09', type: 'lab' }], new Date('2026-08-10'))).toBe(2);
  });
});
