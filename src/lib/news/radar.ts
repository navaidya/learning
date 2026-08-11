import metaRaw from '../../../data/radar-meta.json';
import newsRaw from '../../../data/news.json';
import releasesRaw from '../../../data/releases.json';
import { getTopicProgress } from '../topicProgress';
import type { RadarSummary } from '../types';
import { ageInDays, isNew, scoreImportanceWeight, scoreRecency } from './recency';
import { scoreLearningRelevance } from './relevance';
import { radarCategories, type EngineeringRadarModel, type NewsItem, type RadarCategory, type RadarFreshness } from './types';
import { parseNewsItems, parseRadarCollectionMetaSafe, parseReleaseWatchItems } from './validate';

const DASHBOARD_SUMMARY_SIZE = 5;
/** Radar views are read top-down; beyond this the list is archive, not news. */
const MAX_ITEMS_PER_VIEW = 60;
const LATEST_PANEL_SIZE = 8;

/**
 * For You blends how much an item matters to the current learning plan with how new it is,
 * so a fresh development surfaces without a long-lived critical item permanently owning the top.
 */
export const FOR_YOU_RELEVANCE_WEIGHT = 0.6;
export const FOR_YOU_RECENCY_WEIGHT = 0.4;

/** Category views lead on recency, with importance breaking near-ties. */
const CATEGORY_RECENCY_WEIGHT = 0.6;
const CATEGORY_IMPORTANCE_WEIGHT = 0.4;

/**
 * An architecture shift is worth interrupting the chronological order for, but only while it is
 * still news — past this it sinks back into the normal ranking instead of pinning itself forever.
 */
const SHIFT_PIN_DAYS = 14;

const categoryDomains: Record<Exclude<RadarCategory, 'for-you'>, string[]> = {
  kubernetes: ['kubernetes', 'oke', 'helm', 'gateway-api', 'containers'],
  observability: ['opentelemetry', 'prometheus', 'grafana', 'logging', 'tracing', 'ebpf-cilium'],
  'platform-engineering': ['platform-engineering', 'gitops'],
  aiops: ['aiops', 'agentic-operations', 'mcp'],
  infrastructure: ['terraform', 'opentofu', 'gitops', 'helm', 'kubernetes', 'oke', 'infrastructure'],
};

export function isRadarCategory(value: string): value is RadarCategory {
  return (radarCategories as readonly string[]).includes(value);
}

function byPublishedDesc(a: NewsItem, b: NewsItem): number {
  return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
}

function rankForYou(items: NewsItem[], asOf: Date): NewsItem[] {
  const topics = getTopicProgress(asOf);
  return items
    .map((item) => ({ ...item, relevance: scoreLearningRelevance(item, topics) }))
    .map((item) => ({ item, score: (item.relevance ?? 0) * FOR_YOU_RELEVANCE_WEIGHT + scoreRecency(item.publishedDate, asOf) * FOR_YOU_RECENCY_WEIGHT }))
    .sort((a, b) => (b.score - a.score) || byPublishedDesc(a.item, b.item))
    .map((entry) => entry.item);
}

function rankCategory(items: NewsItem[], asOf: Date): NewsItem[] {
  return items
    .map((item) => ({
      item,
      pinned: item.architectureShift && ageInDays(item.publishedDate, asOf) <= SHIFT_PIN_DAYS,
      score: scoreRecency(item.publishedDate, asOf) * CATEGORY_RECENCY_WEIGHT + scoreImportanceWeight(item.importance) * CATEGORY_IMPORTANCE_WEIGHT,
    }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.score - a.score) || byPublishedDesc(a.item, b.item);
    })
    .map((entry) => entry.item);
}

function buildFreshness(scoped: NewsItem[], newestFirst: NewsItem[], asOf: Date): RadarFreshness {
  const meta = parseRadarCollectionMetaSafe(metaRaw);
  return {
    collectedAt: meta?.collectedAt,
    sourceCount: meta?.sourceIds.length ?? 0,
    failedSourceCount: meta?.failedSourceIds.length ?? 0,
    lastPublishedDate: newestFirst[0]?.publishedDate,
    newCount: scoped.filter((item) => isNew(item.publishedDate, asOf)).length,
    totalCount: scoped.length,
  };
}

export async function getEngineeringRadarModel(category: RadarCategory, asOf = new Date()): Promise<EngineeringRadarModel> {
  const items = parseNewsItems(newsRaw);
  const releases = parseReleaseWatchItems(releasesRaw);

  const scoped = category === 'for-you' ? items : items.filter((item) => categoryDomains[category].includes(item.domain));
  const ranked = category === 'for-you' ? rankForYou(scoped, asOf) : rankCategory(scoped, asOf);
  const newestFirst = [...ranked].sort(byPublishedDesc);

  return {
    category,
    items: ranked.slice(0, MAX_ITEMS_PER_VIEW),
    latest: newestFirst.slice(0, LATEST_PANEL_SIZE),
    releases,
    freshness: buildFreshness(scoped, newestFirst, asOf),
    generatedAt: asOf.toISOString(),
  };
}

/** Recent Radar items whose classified domain matches a skill-map domain, newest first. */
export function getDomainRadarItems(domain: string, limit = 5): NewsItem[] {
  return parseNewsItems(newsRaw)
    .filter((item) => item.domain === domain)
    .sort(byPublishedDesc)
    .slice(0, limit);
}

export async function getRadarSummary(asOf = new Date()): Promise<RadarSummary> {
  const model = await getEngineeringRadarModel('for-you', asOf);
  return { items: model.items.slice(0, DASHBOARD_SUMMARY_SIZE), freshness: model.freshness };
}
