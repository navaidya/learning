import { describe, expect, it } from 'vitest';

describe('news validation', () => {
  it('accepts a well-formed news source', async () => {
    const { parseNewsSource } = await import('../../src/lib/news/validate');
    expect(() => parseNewsSource({
      id: 'kubernetes', name: 'Kubernetes', category: 'kubernetes',
      websiteUrl: 'https://kubernetes.io', priority: 1, enabled: true, tags: ['kubernetes'],
    })).not.toThrow();
  });

  it('rejects a news source with an invalid category', async () => {
    const { parseNewsSource } = await import('../../src/lib/news/validate');
    expect(() => parseNewsSource({
      id: 'x', name: 'X', category: 'not-a-category',
      websiteUrl: 'https://example.test', priority: 1, enabled: true, tags: [],
    })).toThrow();
  });

  it('rejects a news item missing required fields', async () => {
    const { parseNewsItem } = await import('../../src/lib/news/validate');
    expect(() => parseNewsItem({ title: 'missing required fields' })).toThrow();
  });

  it('accepts a well-formed news item', async () => {
    const { parseNewsItem } = await import('../../src/lib/news/validate');
    expect(() => parseNewsItem({
      id: 'kubernetes-gateway-api-v1-6', title: 'Gateway API v1.6 graduates to standard',
      source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/2026/08/03/gateway-api-v1-6-release/',
      publishedDate: '2026-08-03T08:00:00-08:00', domain: 'kubernetes', topics: ['gateway-api'],
      importance: 'high', architectureShift: true, releaseRelated: true,
    })).not.toThrow();
  });

  it('rejects a news item with a non-http(s) url', async () => {
    const { parseNewsItem } = await import('../../src/lib/news/validate');
    expect(() => parseNewsItem({
      id: 'x', title: 'x', source: 'x', sourceId: 'x', url: 'ftp://example.test/file',
      publishedDate: '2026-08-03T08:00:00Z', domain: 'x', topics: [],
      importance: 'low', architectureShift: false, releaseRelated: false,
    })).toThrow();
  });

  it('accepts a well-formed release watch item', async () => {
    const { parseReleaseWatchItem } = await import('../../src/lib/news/validate');
    expect(() => parseReleaseWatchItem({
      project: 'kubernetes', version: 'v1.37.0', publishedDate: '2026-08-01T00:00:00Z',
      url: 'https://github.com/kubernetes/kubernetes/releases/tag/v1.37.0', sourceId: 'kubernetes',
    })).not.toThrow();
  });
});

describe('parseRadarCollectionMeta', () => {
  const valid = { collectedAt: '2026-08-10T06:17:00Z', sourceIds: ['kubernetes'], failedSourceIds: [], itemCount: 12 };

  it('accepts well-formed collection metadata', async () => {
    const { parseRadarCollectionMeta } = await import('../../src/lib/news/validate');
    expect(() => parseRadarCollectionMeta(valid)).not.toThrow();
  });

  it('rejects an unparseable collectedAt', async () => {
    const { parseRadarCollectionMeta } = await import('../../src/lib/news/validate');
    expect(() => parseRadarCollectionMeta({ ...valid, collectedAt: 'yesterday' })).toThrow();
  });

  it('rejects a negative item count', async () => {
    const { parseRadarCollectionMeta } = await import('../../src/lib/news/validate');
    expect(() => parseRadarCollectionMeta({ ...valid, itemCount: -1 })).toThrow();
  });
});

describe('parseRadarCollectionMetaSafe', () => {
  it('returns undefined for malformed metadata rather than throwing, so a bad file cannot fail the build', async () => {
    const { parseRadarCollectionMetaSafe } = await import('../../src/lib/news/validate');
    expect(parseRadarCollectionMetaSafe({ collectedAt: 'nope' })).toBeUndefined();
    expect(parseRadarCollectionMetaSafe(undefined)).toBeUndefined();
  });

  it('returns the parsed metadata when it is valid', async () => {
    const { parseRadarCollectionMetaSafe } = await import('../../src/lib/news/validate');
    const parsed = parseRadarCollectionMetaSafe({ collectedAt: '2026-08-10T06:17:00Z', sourceIds: ['a', 'b'], failedSourceIds: ['c'], itemCount: 3 });
    expect(parsed?.sourceIds).toEqual(['a', 'b']);
    expect(parsed?.failedSourceIds).toEqual(['c']);
  });
});

describe('data/radar-meta.json', () => {
  it('is valid on disk, so the Radar can always report when sources were last checked', async () => {
    const { readFile } = await import('node:fs/promises');
    const { parseRadarCollectionMeta } = await import('../../src/lib/news/validate');
    const raw = JSON.parse(await readFile(new URL('../../data/radar-meta.json', import.meta.url), 'utf8'));
    expect(() => parseRadarCollectionMeta(raw)).not.toThrow();
  });
});
