import { describe, expect, it } from 'vitest';
import type { NewsItem } from '../../src/lib/news/types';
import type { TopicProgress } from '../../src/lib/types';

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: 'item', title: 'Item', source: 'Source', sourceId: 'source', url: 'https://example.test/item',
    publishedDate: '2026-08-10T00:00:00Z', domain: 'opentelemetry', topics: [], importance: 'high',
    architectureShift: false, releaseRelated: false, ...overrides,
  };
}

describe('scoreLearningRelevance', () => {
  it('scores higher when the matching topic has weak progress than when unrelated topics are mastered', async () => {
    const { scoreLearningRelevance } = await import('../../src/lib/news/relevance');
    const highOtelItem = makeItem({ domain: 'opentelemetry' });
    const weakOtelTopics: TopicProgress[] = [
      { topic: { domain: 'opentelemetry', status: 'learning', importance: 'high' }, progress: { score: 20, availableMetrics: ['coverage'] }, debt: { score: 40, severity: 'medium', reasons: ['low coverage'] } },
    ];
    const masteredUnrelatedTopics: TopicProgress[] = [
      { topic: { domain: 'terraform', status: 'mastered', importance: 'low' }, progress: { score: 95, availableMetrics: ['coverage'] }, debt: { score: 0, severity: 'none', reasons: [] } },
    ];
    expect(scoreLearningRelevance(highOtelItem, weakOtelTopics)).toBeGreaterThan(scoreLearningRelevance(highOtelItem, masteredUnrelatedTopics));
  });

  it('scores higher for a matching topic that carries learning debt than one that does not', async () => {
    const { scoreLearningRelevance } = await import('../../src/lib/news/relevance');
    const topics: TopicProgress[] = [
      { topic: { domain: 'opentelemetry', status: 'learning', importance: 'high' }, progress: { score: 40, availableMetrics: ['coverage'] }, debt: { score: 70, severity: 'high', reasons: ['overdue review'] } },
      { topic: { domain: 'prometheus', status: 'learning', importance: 'high' }, progress: { score: 40, availableMetrics: ['coverage'] }, debt: { score: 0, severity: 'none', reasons: [] } },
    ];
    const itemWithDebt = makeItem({ domain: 'opentelemetry', importance: 'medium' });
    const itemWithoutDebt = makeItem({ domain: 'prometheus', importance: 'medium' });
    expect(scoreLearningRelevance(itemWithDebt, topics)).toBeGreaterThan(scoreLearningRelevance(itemWithoutDebt, topics));
  });

  it('returns the base importance score with no domain match', async () => {
    const { scoreLearningRelevance } = await import('../../src/lib/news/relevance');
    const item = makeItem({ domain: 'terraform', importance: 'low' });
    expect(scoreLearningRelevance(item, [])).toBe(5);
  });

  it('clamps to a maximum of 100', async () => {
    const { scoreLearningRelevance } = await import('../../src/lib/news/relevance');
    const item = makeItem({ domain: 'opentelemetry', importance: 'critical' });
    const topics: TopicProgress[] = [
      { topic: { domain: 'opentelemetry', status: 'learning', importance: 'critical' }, progress: { score: 0, availableMetrics: ['coverage'] }, debt: { score: 100, severity: 'critical', reasons: ['never reviewed'] } },
    ];
    expect(scoreLearningRelevance(item, topics)).toBe(100);
  });
});
