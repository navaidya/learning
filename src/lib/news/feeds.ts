import { createHash } from 'node:crypto';
import type { NewsSource } from './types.ts';

export interface RawFeedItem {
  title?: string;
  url?: string;
  publishedDate?: string;
  summary?: string;
}

export interface NormalizedCandidate {
  id: string;
  title: string;
  summary?: string;
  url: string;
  publishedDate: string;
}

const trackingParamPattern = /^(utm_.*|ref|source)$/i;
const htmlEntities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function stripHtml(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');
}

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return htmlEntities[entity.toLowerCase()] ?? match;
  });
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeText(value: string): string {
  return collapseWhitespace(decodeEntities(stripHtml(value)));
}

export function canonicalizeUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    if (!/^https?:$/i.test(url.protocol)) return undefined;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) if (trackingParamPattern.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return undefined;
  }
}

export function stableCandidateId(sourceId: string, canonicalUrl: string): string {
  return `${sourceId}-${createHash('sha1').update(canonicalUrl).digest('hex').slice(0, 12)}`;
}

export function normalizeFeedItem(raw: RawFeedItem, source: NewsSource): NormalizedCandidate | undefined {
  if (!raw.title || !raw.url || !raw.publishedDate) return undefined;

  const canonicalUrl = canonicalizeUrl(raw.url);
  if (!canonicalUrl) return undefined;

  const publishedMs = Date.parse(raw.publishedDate);
  if (Number.isNaN(publishedMs)) return undefined;

  const title = sanitizeText(raw.title);
  if (!title) return undefined;

  const summary = raw.summary ? sanitizeText(raw.summary).slice(0, 500) : undefined;

  return {
    id: stableCandidateId(source.id, canonicalUrl),
    title,
    summary: summary || undefined,
    url: canonicalUrl,
    publishedDate: new Date(publishedMs).toISOString(),
  };
}
