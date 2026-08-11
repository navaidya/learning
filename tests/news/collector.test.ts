import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { NewsItem, NewsSource } from '../../src/lib/news/types';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/news');

const healthySource: NewsSource = { id: 'healthy', name: 'Healthy', category: 'infrastructure', websiteUrl: 'https://healthy.test', feedUrl: 'https://healthy.test/feed.xml', priority: 2, enabled: true, tags: [] };
const failedSource: NewsSource = { id: 'failed', name: 'Failed', category: 'infrastructure', websiteUrl: 'https://failed.test', feedUrl: 'https://failed.test/feed.xml', priority: 2, enabled: true, tags: [] };

const existing: NewsItem = {
  id: 'existing-1', title: 'Existing item', source: 'Other', sourceId: 'other', url: 'https://example.test/existing',
  publishedDate: '2026-07-20T00:00:00Z', domain: 'infrastructure', topics: [], importance: 'low',
  architectureShift: false, releaseRelated: false,
};

async function fixtureFetch(url: string) {
  if (url === healthySource.feedUrl) {
    return { ok: true, status: 200, text: async () => readFile(path.join(fixturesDir, 'rss.xml'), 'utf8') };
  }
  return { ok: false, status: 500, text: async () => '' };
}

describe('parseFeedXml', () => {
  it('extracts RSS items, skipping the one with no link', async () => {
    const { parseFeedXml } = await import('../../scripts/news/collect.mjs');
    const xml = await readFile(path.join(fixturesDir, 'rss.xml'), 'utf8');
    const items = parseFeedXml(xml);
    expect(items).toHaveLength(5);
    expect(items.find((item: { title?: string }) => item.title === 'Fixture item missing a link')?.url).toBeUndefined();
  });

  it('extracts Atom entries, including the entry with no link', async () => {
    const { parseFeedXml } = await import('../../scripts/news/collect.mjs');
    const xml = await readFile(path.join(fixturesDir, 'atom.xml'), 'utf8');
    const items = parseFeedXml(xml);
    expect(items).toHaveLength(3);
    expect(items[0].url).toBe('https://example.test/releases/tag/v1.2.0');
  });
});

describe('collectRadar', () => {
  it('fetches each source independently, skips a malformed entry, dedupes a shared URL, and never loses existing data to a failed source', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const asOf = new Date('2026-08-10T00:00:00Z');
    const result = await collectRadar({ sources: [healthySource, failedSource], existingItems: [existing], fetchImpl: fixtureFetch, asOf });

    expect(result.fetchedSourceIds).toEqual(['healthy']);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].sourceId).toBe('failed');
    expect(result.items).toContainEqual(existing);

    // 5 RSS items in the fixture: 1 has no link (skipped), 2 share a canonical URL (deduped to 1) => 3 distinct + the pre-existing item.
    expect(result.items).toHaveLength(4);

    const shared = result.items.find((item: NewsItem) => item.url === 'https://example.test/blog/shared');
    expect(shared?.title).toBe('Fixture item sharing a canonical URL (second copy)');
  });

  it('retains prior items and reports every source as failed when all sources fail', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const asOf = new Date('2026-08-10T00:00:00Z');
    const result = await collectRadar({ sources: [failedSource], existingItems: [existing], fetchImpl: fixtureFetch, asOf });

    expect(result.fetchedSourceIds).toEqual([]);
    expect(result.failures).toHaveLength(1);
    expect(result.items).toEqual([existing]);
  });
});

describe('collectRadar concurrency', () => {
  it('fetches sources in parallel up to the concurrency limit', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const sources: NewsSource[] = Array.from({ length: 8 }, (_, index) => ({
      ...healthySource, id: `s${index}`, name: `S${index}`, feedUrl: `https://healthy.test/${index}.xml`,
    }));

    let inFlight = 0;
    let peakInFlight = 0;
    const rss = await readFile(path.join(fixturesDir, 'rss.xml'), 'utf8');
    const trackingFetch = async () => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { ok: true, status: 200, text: async () => rss };
    };

    const result = await collectRadar({ sources, fetchImpl: trackingFetch, asOf: new Date('2026-08-10T00:00:00Z'), concurrency: 3 });

    expect(peakInFlight).toBeGreaterThan(1);
    expect(peakInFlight).toBeLessThanOrEqual(3);
    expect(result.fetchedSourceIds).toHaveLength(8);
  });

  it('reports sources in configured order however the parallel fetches resolve', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const rss = await readFile(path.join(fixturesDir, 'rss.xml'), 'utf8');
    const sources: NewsSource[] = ['alpha', 'beta', 'gamma'].map((id) => ({ ...healthySource, id, name: id, feedUrl: `https://healthy.test/${id}.xml` }));

    // Resolve in reverse order: alpha is slowest, gamma fastest.
    const delays: Record<string, number> = { 'https://healthy.test/alpha.xml': 30, 'https://healthy.test/beta.xml': 15, 'https://healthy.test/gamma.xml': 1 };
    const staggeredFetch = async (url: string) => {
      await new Promise((resolve) => setTimeout(resolve, delays[url]));
      return { ok: true, status: 200, text: async () => rss };
    };

    const result = await collectRadar({ sources, fetchImpl: staggeredFetch, asOf: new Date('2026-08-10T00:00:00Z'), concurrency: 3 });
    expect(result.fetchedSourceIds).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('isolates a failing source from the sources running alongside it', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const rss = await readFile(path.join(fixturesDir, 'rss.xml'), 'utf8');
    const sources: NewsSource[] = [
      { ...healthySource, id: 'ok-1', feedUrl: 'https://healthy.test/1.xml' },
      { ...failedSource, id: 'boom', feedUrl: 'https://failed.test/feed.xml' },
      { ...healthySource, id: 'ok-2', feedUrl: 'https://healthy.test/2.xml' },
    ];
    const mixedFetch = async (url: string) => (url.startsWith('https://healthy.test')
      ? { ok: true, status: 200, text: async () => rss }
      : { ok: false, status: 503, text: async () => '' });

    const result = await collectRadar({ sources, fetchImpl: mixedFetch, asOf: new Date('2026-08-10T00:00:00Z'), concurrency: 3 });
    expect(result.fetchedSourceIds).toEqual(['ok-1', 'ok-2']);
    expect(result.failures.map((failure: { sourceId: string }) => failure.sourceId)).toEqual(['boom']);
  });

  it('skips disabled and feedless sources without counting them as failures', async () => {
    const { collectRadar } = await import('../../scripts/news/collect.mjs');
    const sources: NewsSource[] = [
      { ...healthySource, id: 'on' },
      { ...healthySource, id: 'off', enabled: false },
      { ...healthySource, id: 'no-feed', feedUrl: undefined },
    ];
    const result = await collectRadar({ sources, fetchImpl: fixtureFetch, asOf: new Date('2026-08-10T00:00:00Z') });
    expect(result.fetchedSourceIds).toEqual(['on']);
    expect(result.failures).toEqual([]);
  });
});
