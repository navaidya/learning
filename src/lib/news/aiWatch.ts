import type { NewsItem, NewsSource, RadarCollectionMeta } from './types';

export interface WatchTrack {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  learn: string;
  exercise: string;
}

/** Newest first with a per-source cap, so a fast release train cannot own a reading list. */
export function selectWatchItems(items: NewsItem[], sources: NewsSource[], track?: WatchTrack, format?: string, asOf = new Date()): NewsItem[] {
  const bySource = new Map(sources.map(source => [source.id, source]));
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  return [...items].sort((a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate))
    .filter(item => {
      const source = bySource.get(item.sourceId);
      const age = asOf.getTime() - Date.parse(item.publishedDate);
      if (!source?.enabled || !Number.isFinite(age) || age < 0 || age > 30 * 86400000) return false;
      if (format && !source.tags.includes(format)) return false;
      const text = (item.title + ' ' + (item.summary ?? '')).toLowerCase();
      if (track && !source.tags.includes(track.id) && !track.keywords.some(word => text.includes(word))) return false;
      if (seen.has(item.url) || (counts.get(source.id) ?? 0) >= 2) return false;
      seen.add(item.url);
      counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
      return true;
    }).slice(0, 6);
}

export function watchSourceStatus(sourceId: string, meta: RadarCollectionMeta | undefined, asOf = new Date()): string {
  if (!meta) return 'Not checked yet';
  if (meta.failedSourceIds.includes(sourceId)) return 'Last check failed · retained items may be older';
  if (!meta.sourceIds.includes(sourceId)) return 'Not checked yet';
  const age = asOf.getTime() - Date.parse(meta.collectedAt);
  if (!Number.isFinite(age) || age < 0 || age > 36 * 3600000) return 'Check overdue';
  return 'Feed checked';
}
