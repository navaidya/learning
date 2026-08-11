import { z } from 'zod';
import { newsCategories, newsImportances, type NewsItem, type NewsSource, type RadarCollectionMeta, type ReleaseWatchItem } from './types.ts';

const httpUrl = z.string().url().refine((value) => /^https?:\/\//i.test(value), 'must be an http(s) URL');
const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'must be an ISO date string');

const newsSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(newsCategories),
  websiteUrl: httpUrl,
  feedUrl: httpUrl.optional(),
  priority: z.number().int().min(1).max(3),
  enabled: z.boolean(),
  tags: z.array(z.string()).default([]),
  filterKeywords: z.array(z.string().min(1)).nonempty().optional(),
}) satisfies z.ZodType<NewsSource>;

const newsItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().max(500).optional(),
  source: z.string().min(1),
  sourceId: z.string().min(1),
  url: httpUrl,
  publishedDate: isoDate,
  domain: z.string().min(1),
  topics: z.array(z.string()).default([]),
  importance: z.enum(newsImportances),
  architectureShift: z.boolean(),
  releaseRelated: z.boolean(),
  releaseProject: z.string().optional(),
  releaseVersion: z.string().optional(),
  relevance: z.number().min(0).max(100).optional(),
  relatedTopics: z.array(z.string()).optional(),
}) satisfies z.ZodType<NewsItem>;

const releaseWatchItemSchema = z.object({
  project: z.string().min(1),
  version: z.string().min(1),
  publishedDate: isoDate,
  url: httpUrl,
  sourceId: z.string().min(1),
  title: z.string().optional(),
}) satisfies z.ZodType<ReleaseWatchItem>;

const radarCollectionMetaSchema = z.object({
  collectedAt: isoDate,
  sourceIds: z.array(z.string().min(1)).default([]),
  failedSourceIds: z.array(z.string().min(1)).default([]),
  itemCount: z.number().int().min(0),
}) satisfies z.ZodType<RadarCollectionMeta>;

export function parseNewsSource(value: unknown): NewsSource {
  return newsSourceSchema.parse(value);
}

export function parseNewsSources(value: unknown): NewsSource[] {
  return z.array(newsSourceSchema).parse(value);
}

export function parseNewsItem(value: unknown): NewsItem {
  return newsItemSchema.parse(value);
}

export function parseNewsItems(value: unknown): NewsItem[] {
  return z.array(newsItemSchema).parse(value);
}

export function parseReleaseWatchItem(value: unknown): ReleaseWatchItem {
  return releaseWatchItemSchema.parse(value);
}

export function parseReleaseWatchItems(value: unknown): ReleaseWatchItem[] {
  return z.array(releaseWatchItemSchema).parse(value);
}

export function parseRadarCollectionMeta(value: unknown): RadarCollectionMeta {
  return radarCollectionMetaSchema.parse(value);
}

/**
 * Metadata is a freshness nicety, not load-bearing data: a missing or malformed file must
 * degrade to "unknown last-collected time" rather than fail the build.
 */
export function parseRadarCollectionMetaSafe(value: unknown): RadarCollectionMeta | undefined {
  const result = radarCollectionMetaSchema.safeParse(value);
  return result.success ? result.data : undefined;
}
