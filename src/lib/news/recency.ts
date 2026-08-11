import type { NewsImportance } from './types.ts';

export const freshnessBuckets = ['today', 'this-week', 'this-month', 'earlier'] as const;
export type FreshnessBucket = (typeof freshnessBuckets)[number];

/**
 * Half-life, in days, of an item's recency score: a 7-day-old item is worth half a
 * brand-new one, a 14-day-old item a quarter. Chosen so a genuinely new development
 * outranks last month's on freshness alone without erasing importance entirely.
 */
export const RECENCY_HALF_LIFE_DAYS = 7;

/** An item is labelled "new" for this many days after publication. */
export const NEW_ITEM_DAYS = 7;

const MS_PER_DAY = 86_400_000;

const importanceScores: Record<NewsImportance, number> = { critical: 100, high: 75, medium: 45, low: 20 };

/** Age in whole-and-fractional days, floored at 0. Unparseable dates are infinitely old. */
export function ageInDays(publishedDate: string, asOf: Date): number {
  const published = Date.parse(publishedDate);
  if (Number.isNaN(published)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (asOf.getTime() - published) / MS_PER_DAY);
}

/** 0-100, halving every RECENCY_HALF_LIFE_DAYS. Unparseable dates score 0 rather than throwing. */
export function scoreRecency(publishedDate: string, asOf: Date): number {
  const age = ageInDays(publishedDate, asOf);
  if (!Number.isFinite(age)) return 0;
  return 100 * Math.pow(0.5, age / RECENCY_HALF_LIFE_DAYS);
}

/** 0-100 importance, so importance and recency can be blended on one scale. */
export function scoreImportanceWeight(importance: NewsImportance): number {
  return importanceScores[importance];
}

export function freshnessBucketOf(publishedDate: string, asOf: Date): FreshnessBucket {
  const age = ageInDays(publishedDate, asOf);
  if (age < 1) return 'today';
  if (age < 7) return 'this-week';
  if (age < 30) return 'this-month';
  return 'earlier';
}

export function isNew(publishedDate: string, asOf: Date): boolean {
  return ageInDays(publishedDate, asOf) < NEW_ITEM_DAYS;
}

/** Human relative age ("3 days ago"). Deliberately coarse — the exact date is shown alongside it. */
export function relativeTimeLabel(publishedDate: string, asOf: Date): string {
  const age = ageInDays(publishedDate, asOf);
  if (!Number.isFinite(age)) return 'date unknown';

  const days = Math.floor(age);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return weeks === 1 ? 'last week' : `${weeks} weeks ago`;

  const months = Math.floor(days / 30);
  return months === 1 ? 'last month' : `${months} months ago`;
}
