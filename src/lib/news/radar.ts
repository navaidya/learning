import newsRaw from '../../../data/news.json';
import releasesRaw from '../../../data/releases.json';
import { getTopicProgress } from '../topicProgress';
import type { RadarSummary } from '../types';
import { scoreLearningRelevance } from './relevance';
import { radarCategories, type EngineeringRadarModel, type NewsItem, type RadarCategory } from './types';
import { parseNewsItems, parseReleaseWatchItems } from './validate';

const DASHBOARD_SUMMARY_SIZE = 5;

const categoryDomains: Record<Exclude<RadarCategory, 'for-you'>, string[]> = {
  kubernetes: ['kubernetes', 'oke', 'helm', 'gateway-api'],
  observability: ['opentelemetry', 'prometheus', 'grafana', 'logging', 'tracing', 'ebpf-cilium'],
  'platform-engineering': ['platform-engineering', 'gitops'],
  aiops: ['aiops', 'agentic-operations', 'mcp'],
  infrastructure: ['terraform', 'opentofu', 'gitops', 'helm', 'kubernetes', 'oke', 'infrastructure'],
};

export function isRadarCategory(value: string): value is RadarCategory {
  return (radarCategories as readonly string[]).includes(value);
}

export async function getEngineeringRadarModel(category: RadarCategory, asOf = new Date()): Promise<EngineeringRadarModel> {
  const items = parseNewsItems(newsRaw);
  const releases = parseReleaseWatchItems(releasesRaw);

  let scoped: NewsItem[];
  if (category === 'for-you') {
    const topics = getTopicProgress(asOf);
    scoped = [...items]
      .map((item) => ({ ...item, relevance: scoreLearningRelevance(item, topics) }))
      .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
  } else {
    const domains = categoryDomains[category];
    scoped = items
      .filter((item) => domains.includes(item.domain))
      .sort((a, b) => {
        if (a.architectureShift !== b.architectureShift) return a.architectureShift ? -1 : 1;
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
  }

  return { category, items: scoped, releases, generatedAt: asOf.toISOString() };
}

/** Recent Radar items whose classified domain matches a skill-map domain, newest first. */
export function getDomainRadarItems(domain: string, limit = 5): NewsItem[] {
  return parseNewsItems(newsRaw)
    .filter((item) => item.domain === domain)
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .slice(0, limit);
}

export async function getRadarSummary(asOf = new Date()): Promise<RadarSummary> {
  const model = await getEngineeringRadarModel('for-you', asOf);
  return { items: model.items.slice(0, DASHBOARD_SUMMARY_SIZE) };
}
