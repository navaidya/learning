import { describe, expect, it } from 'vitest';

const asOf = new Date('2026-08-10T00:00:00Z');
const daysBefore = (days: number) => new Date(asOf.getTime() - days * 86_400_000).toISOString();

describe('ageInDays', () => {
  it('measures the gap between publication and now', async () => {
    const { ageInDays } = await import('../../src/lib/news/recency');
    expect(ageInDays(daysBefore(3), asOf)).toBeCloseTo(3);
  });

  it('floors a future publication date at zero rather than going negative', async () => {
    const { ageInDays } = await import('../../src/lib/news/recency');
    expect(ageInDays(daysBefore(-5), asOf)).toBe(0);
  });

  it('treats an unparseable date as infinitely old', async () => {
    const { ageInDays } = await import('../../src/lib/news/recency');
    expect(ageInDays('not a date', asOf)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('scoreRecency', () => {
  it('scores a brand-new item at the maximum', async () => {
    const { scoreRecency } = await import('../../src/lib/news/recency');
    expect(scoreRecency(asOf.toISOString(), asOf)).toBe(100);
  });

  it('halves the score after one half-life', async () => {
    const { scoreRecency, RECENCY_HALF_LIFE_DAYS } = await import('../../src/lib/news/recency');
    expect(scoreRecency(daysBefore(RECENCY_HALF_LIFE_DAYS), asOf)).toBeCloseTo(50);
    expect(scoreRecency(daysBefore(RECENCY_HALF_LIFE_DAYS * 2), asOf)).toBeCloseTo(25);
  });

  it('decreases monotonically with age', async () => {
    const { scoreRecency } = await import('../../src/lib/news/recency');
    const scores = [0, 1, 5, 20, 60].map((days) => scoreRecency(daysBefore(days), asOf));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('scores an unparseable date at zero instead of throwing', async () => {
    const { scoreRecency } = await import('../../src/lib/news/recency');
    expect(scoreRecency('not a date', asOf)).toBe(0);
  });
});

describe('freshnessBucketOf', () => {
  it('buckets items by age, with the boundaries falling in the older bucket', async () => {
    const { freshnessBucketOf } = await import('../../src/lib/news/recency');
    expect(freshnessBucketOf(daysBefore(0.5), asOf)).toBe('today');
    expect(freshnessBucketOf(daysBefore(1), asOf)).toBe('this-week');
    expect(freshnessBucketOf(daysBefore(6.9), asOf)).toBe('this-week');
    expect(freshnessBucketOf(daysBefore(7), asOf)).toBe('this-month');
    expect(freshnessBucketOf(daysBefore(30), asOf)).toBe('earlier');
  });
});

describe('isNew', () => {
  it('marks items inside the new-item window and nothing older', async () => {
    const { isNew, NEW_ITEM_DAYS } = await import('../../src/lib/news/recency');
    expect(isNew(daysBefore(NEW_ITEM_DAYS - 0.1), asOf)).toBe(true);
    expect(isNew(daysBefore(NEW_ITEM_DAYS), asOf)).toBe(false);
  });
});

describe('relativeTimeLabel', () => {
  it('labels each age band in readable terms', async () => {
    const { relativeTimeLabel } = await import('../../src/lib/news/recency');
    expect(relativeTimeLabel(daysBefore(0.2), asOf)).toBe('today');
    expect(relativeTimeLabel(daysBefore(1), asOf)).toBe('yesterday');
    expect(relativeTimeLabel(daysBefore(4), asOf)).toBe('4 days ago');
    expect(relativeTimeLabel(daysBefore(8), asOf)).toBe('last week');
    expect(relativeTimeLabel(daysBefore(21), asOf)).toBe('3 weeks ago');
    expect(relativeTimeLabel(daysBefore(45), asOf)).toBe('last month');
    expect(relativeTimeLabel(daysBefore(75), asOf)).toBe('2 months ago');
  });

  it('degrades to a safe label for an unparseable date', async () => {
    const { relativeTimeLabel } = await import('../../src/lib/news/recency');
    expect(relativeTimeLabel('not a date', asOf)).toBe('date unknown');
  });
});
