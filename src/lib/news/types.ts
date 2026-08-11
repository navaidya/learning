export const newsCategories = ['kubernetes', 'observability', 'platform-engineering', 'aiops', 'infrastructure'] as const;
export type NewsCategory = (typeof newsCategories)[number];

export const radarCategories = ['for-you', ...newsCategories] as const;
export type RadarCategory = (typeof radarCategories)[number];

export const newsImportances = ['low', 'medium', 'high', 'critical'] as const;
export type NewsImportance = (typeof newsImportances)[number];

export interface NewsSource {
  id: string;
  name: string;
  category: NewsCategory;
  websiteUrl: string;
  feedUrl?: string;
  priority: number;
  enabled: boolean;
  tags: string[];
  /**
   * Optional on-topic gate for broad company feeds that also publish outside the Radar's areas.
   * When present, an item must mention at least one keyword to be collected.
   */
  filterKeywords?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  sourceId: string;
  url: string;
  publishedDate: string;
  domain: string;
  topics: string[];
  importance: NewsImportance;
  architectureShift: boolean;
  releaseRelated: boolean;
  releaseProject?: string;
  releaseVersion?: string;
  relevance?: number;
  relatedTopics?: string[];
}

export interface ReleaseWatchItem {
  project: string;
  version: string;
  publishedDate: string;
  url: string;
  sourceId: string;
  title?: string;
}

/** Written by the collector so the page can report when sources were last checked, not merely when the site was built. */
export interface RadarCollectionMeta {
  collectedAt: string;
  sourceIds: string[];
  failedSourceIds: string[];
  itemCount: number;
}

export interface RadarFreshness {
  /** Absent until the collector has run at least once since metadata was introduced. */
  collectedAt?: string;
  sourceCount: number;
  failedSourceCount: number;
  /** Publication date of the newest item in this view, if it has any. */
  lastPublishedDate?: string;
  /** Items in this view published within the last NEW_ITEM_DAYS days. */
  newCount: number;
  /** Items matching this view before the display cap is applied. */
  totalCount: number;
}

export interface EngineeringRadarModel {
  category: RadarCategory;
  items: NewsItem[];
  /** The same view sorted strictly newest-first, so pure recency is always one glance away. */
  latest: NewsItem[];
  releases: ReleaseWatchItem[];
  freshness: RadarFreshness;
  generatedAt: string;
}
