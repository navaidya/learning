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
