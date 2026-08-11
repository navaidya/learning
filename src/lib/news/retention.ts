import type { NewsImportance, NewsItem, ReleaseWatchItem } from './types.ts';

const MAX_RETAINED = 500;
const MAX_AGE_DAYS = 90;
const importanceWeight: Record<NewsImportance, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function mergeNews(existing: NewsItem[], incoming: NewsItem[], asOf: Date): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const item of [...existing, ...incoming]) {
    const current = byId.get(item.id);
    if (!current || new Date(item.publishedDate).getTime() > new Date(current.publishedDate).getTime()) byId.set(item.id, item);
  }

  const maxAgeMs = MAX_AGE_DAYS * 86_400_000;
  const retained = Array.from(byId.values()).filter((item) => {
    const published = new Date(item.publishedDate).getTime();
    if (Number.isNaN(published)) return false;
    if (published > asOf.getTime()) return false;
    return asOf.getTime() - published <= maxAgeMs;
  });

  retained.sort((a, b) => {
    const weightDiff = importanceWeight[b.importance] - importanceWeight[a.importance];
    return weightDiff !== 0 ? weightDiff : new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
  });

  const capped = retained.slice(0, MAX_RETAINED);
  capped.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  return capped;
}

export function deriveReleaseWatch(items: NewsItem[]): ReleaseWatchItem[] {
  const byProject = new Map<string, NewsItem>();
  for (const item of items) {
    if (!item.releaseRelated || !item.releaseProject || !item.releaseVersion) continue;
    const current = byProject.get(item.releaseProject);
    if (!current || new Date(item.publishedDate).getTime() > new Date(current.publishedDate).getTime()) byProject.set(item.releaseProject, item);
  }

  return Array.from(byProject.values())
    .map((item): ReleaseWatchItem => ({
      project: item.releaseProject!,
      version: item.releaseVersion!,
      publishedDate: item.publishedDate,
      url: item.url,
      sourceId: item.sourceId,
      title: item.title,
    }))
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
}
