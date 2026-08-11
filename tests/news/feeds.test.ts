import { describe, expect, it } from 'vitest';
import type { NewsSource } from '../../src/lib/news/types';

const source: NewsSource = { id: 'otel', name: 'OpenTelemetry', category: 'observability', websiteUrl: 'https://opentelemetry.io', priority: 1, enabled: true, tags: [] };

describe('normalizeFeedItem', () => {
  it('strips HTML from the summary and collapses whitespace', async () => {
    const { normalizeFeedItem } = await import('../../src/lib/news/feeds');
    expect(normalizeFeedItem({
      title: 'OTel <b>release</b>', url: 'https://example.test/release?utm_source=rss',
      publishedDate: '2026-08-10', summary: '<p>Safe <em>text</em></p>',
    }, source)?.summary).toBe('Safe text');
  });

  it('removes tracking query parameters and fragments from the canonical URL', async () => {
    const { normalizeFeedItem } = await import('../../src/lib/news/feeds');
    const result = normalizeFeedItem({ title: 'Release notes', url: 'https://Example.test/post?utm_campaign=x&id=1#section', publishedDate: '2026-08-10' }, source);
    expect(result?.url).toBe('https://example.test/post?id=1');
  });

  it('returns undefined when the URL is missing', async () => {
    const { normalizeFeedItem } = await import('../../src/lib/news/feeds');
    expect(normalizeFeedItem({ title: 'No link here', publishedDate: '2026-08-10' }, source)).toBeUndefined();
  });

  it('returns undefined for an unparseable published date', async () => {
    const { normalizeFeedItem } = await import('../../src/lib/news/feeds');
    expect(normalizeFeedItem({ title: 'Bad date', url: 'https://example.test/post', publishedDate: 'not-a-date' }, source)).toBeUndefined();
  });

  it('produces the same id for two URLs that share the same canonical form', async () => {
    const { normalizeFeedItem } = await import('../../src/lib/news/feeds');
    const a = normalizeFeedItem({ title: 'Post', url: 'https://example.test/post?utm_source=rss', publishedDate: '2026-08-10' }, source);
    const b = normalizeFeedItem({ title: 'Post', url: 'https://example.test/post?utm_source=newsletter', publishedDate: '2026-08-11' }, source);
    expect(a?.id).toBe(b?.id);
  });
});

describe('matchesSourceFilter', () => {
  const unfiltered = { filterKeywords: undefined };
  const filtered = { filterKeywords: ['mcp', 'agentic operations'] };

  it('accepts everything from a source with no keyword filter', async () => {
    const { matchesSourceFilter } = await import('../../src/lib/news/feeds');
    expect(matchesSourceFilter('Anything at all', unfiltered)).toBe(true);
    expect(matchesSourceFilter('Anything at all', { filterKeywords: [] })).toBe(true);
  });

  it('accepts an item that mentions any one keyword, case-insensitively', async () => {
    const { matchesSourceFilter } = await import('../../src/lib/news/feeds');
    expect(matchesSourceFilter('New MCP server registry', filtered)).toBe(true);
    expect(matchesSourceFilter('Introducing Agentic Operations', filtered)).toBe(true);
  });

  it('rejects an off-topic item from a filtered source', async () => {
    const { matchesSourceFilter } = await import('../../src/lib/news/feeds');
    expect(matchesSourceFilter('What building an AI-native finance function taught me', filtered)).toBe(false);
  });
});
