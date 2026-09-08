import { describe, expect, it } from 'vitest';
import { selectWatchItems, watchSourceStatus } from '../../src/lib/news/aiWatch';
import type { NewsSource, NewsItem } from '../../src/lib/news/types';
import { parseFeedXml, collectRadar } from '../../scripts/news/collect.mjs';

const asOf = new Date('2026-09-08T12:00:00Z');
const source: NewsSource = { id: 'one', name: 'One', category: 'aiops', websiteUrl: 'https://example.org', feedUrl: 'https://example.org/rss', enabled: true, priority: 1, tags: ['agent-development', 'podcast'] };
const item = (id: string, sourceId = 'one', publishedDate = '2026-09-07T12:00:00Z'): NewsItem => ({
  id, sourceId, title: id, source: sourceId, url: 'https://example.org/' + id,
  publishedDate, domain: 'aiops', topics: [], importance: 'medium', architectureShift: false, releaseRelated: false,
});
describe('AI Watch', () => {
  it('limits prolific sources while preserving other sources and removing duplicates', () => {
    const result = selectWatchItems([item('a'), item('b'), item('c'), item('d', 'two'), item('a', 'two')], [source, { ...source, id: 'two' }], undefined, undefined, asOf);
    expect(result.map(x => x.id)).toEqual(['a', 'b', 'd']);
  });
  it('excludes old, future, disabled, unknown and non-podcast records', () => {
    const result = selectWatchItems([item('valid'), item('old', 'one', '2026-01-01'), item('future', 'one', '2027-01-01'), item('disabled', 'off'), item('unknown', 'missing'), item('video', 'video')],
      [source, { ...source, id: 'off', enabled: false }, { ...source, id: 'video', tags: ['video'] }], undefined, 'podcast', asOf);
    expect(result.map(x => x.id)).toEqual(['valid']);
  });
  it('matches focus by source tag or article content, not unrelated generic news', () => {
    const track = { id: 'agent-development', title: '', description: '', keywords: ['mcp'], learn: '/book', exercise: '' };
    expect(selectWatchItems([item('sdk-release'), item('MCP upgrade', 'two'), item('unrelated', 'two')], [source, { ...source, id: 'two', tags: [] }], track, undefined, asOf).map(x => x.id)).toEqual(['sdk-release', 'MCP upgrade']);
  });
  it('distinguishes missing, failed and overdue collection state', () => {
    expect(watchSourceStatus('one', undefined, asOf)).toBe('Not checked yet');
    const meta = { collectedAt: asOf.toISOString(), sourceIds: ['one'], failedSourceIds: ['two'], itemCount: 1 };
    expect(watchSourceStatus('one', meta, asOf)).toBe('Feed checked');
    expect(watchSourceStatus('two', meta, asOf)).toContain('failed');
    expect(watchSourceStatus('new', meta, asOf)).toBe('Not checked yet');
    expect(watchSourceStatus('one', { ...meta, collectedAt: '2026-09-01' }, asOf)).toBe('Check overdue');
  });
  it('preserves a YouTube publication date even if its metadata was updated later', () => {
    const parsed = parseFeedXml('<feed><entry><title>Agent talk</title><link rel="alternate" href="https://www.youtube.com/watch?v=123"/><published>2026-09-01T00:00:00Z</published><updated>2026-09-08T00:00:00Z</updated></entry></feed>');
    expect(parsed[0].publishedDate).toBe('2026-09-01T00:00:00Z');
  });
  it('reports HTTP 200 HTML as a feed failure and retains previous articles', async () => {
    const result = await collectRadar({ sources: [source], existingItems: [item('prior')], asOf, fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<html><body>Maintenance</body></html>' }) });
    expect(result.fetchedSourceIds).toEqual([]);
    expect(result.failures.map(x => x.sourceId)).toEqual(['one']);
    expect(result.items.map(x => x.id)).toEqual(['prior']);
  });
});
