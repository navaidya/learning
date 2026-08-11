import { describe, expect, it } from 'vitest';
import type { NewsItem } from '../../src/lib/news/types';

const asOf = new Date('2026-08-10T00:00:00Z');

function makeItem(overrides: Partial<NewsItem> & { id: string }): NewsItem {
  return {
    title: overrides.id, source: 'Source', sourceId: 'source', url: `https://example.test/${overrides.id}`,
    publishedDate: '2026-08-09T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'medium',
    architectureShift: false, releaseRelated: false, ...overrides,
  };
}

describe('mergeNews', () => {
  it('deduplicates records that share an id', async () => {
    const { mergeNews } = await import('../../src/lib/news/retention');
    const first = makeItem({ id: 'a', publishedDate: '2026-08-08T00:00:00Z' });
    const duplicate = makeItem({ id: 'a', publishedDate: '2026-08-09T00:00:00Z' });
    expect(mergeNews([], [first, duplicate], asOf)).toHaveLength(1);
  });

  it('keeps the newest record when the same id appears twice', async () => {
    const { mergeNews } = await import('../../src/lib/news/retention');
    const older = makeItem({ id: 'a', title: 'older', publishedDate: '2026-08-08T00:00:00Z' });
    const newer = makeItem({ id: 'a', title: 'newer', publishedDate: '2026-08-09T00:00:00Z' });
    const [result] = mergeNews([older], [newer], asOf);
    expect(result.title).toBe('newer');
  });

  it('rejects records with a future published date', async () => {
    const { mergeNews } = await import('../../src/lib/news/retention');
    const future = makeItem({ id: 'a', publishedDate: '2026-08-11T00:00:00Z' });
    expect(mergeNews([], [future], asOf)).toHaveLength(0);
  });

  it('removes records older than 90 days', async () => {
    const { mergeNews } = await import('../../src/lib/news/retention');
    const stale = makeItem({ id: 'a', publishedDate: '2026-01-01T00:00:00Z' });
    expect(mergeNews([], [stale], asOf)).toHaveLength(0);
  });

  it('retains at most 500 records, preferring higher importance', async () => {
    const { mergeNews } = await import('../../src/lib/news/retention');
    const low = Array.from({ length: 500 }, (_, i) => makeItem({ id: `low-${i}`, importance: 'low' }));
    const high = makeItem({ id: 'high-priority', importance: 'critical' });
    const result = mergeNews([], [...low, high], asOf);
    expect(result).toHaveLength(500);
    expect(result.some((item) => item.id === 'high-priority')).toBe(true);
  });
});

describe('deriveReleaseWatch', () => {
  it('keeps only the latest release per project', async () => {
    const { deriveReleaseWatch } = await import('../../src/lib/news/retention');
    const older = makeItem({ id: 'a', releaseRelated: true, releaseProject: 'kubernetes', releaseVersion: 'v1.36.0', publishedDate: '2026-08-01T00:00:00Z' });
    const newer = makeItem({ id: 'b', releaseRelated: true, releaseProject: 'kubernetes', releaseVersion: 'v1.37.0', publishedDate: '2026-08-05T00:00:00Z' });
    const result = deriveReleaseWatch([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].version).toBe('v1.37.0');
  });

  it('ignores items that are not release-related', async () => {
    const { deriveReleaseWatch } = await import('../../src/lib/news/retention');
    const item = makeItem({ id: 'a', releaseRelated: false });
    expect(deriveReleaseWatch([item])).toHaveLength(0);
  });
});
