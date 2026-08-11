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

export interface EngineeringRadarModel {
  category: RadarCategory;
  items: NewsItem[];
  releases: ReleaseWatchItem[];
  generatedAt: string;
}
