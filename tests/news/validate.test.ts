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
