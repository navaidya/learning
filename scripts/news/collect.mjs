import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { classifyNews } from '../../src/lib/news/classifier.ts';
import { normalizeFeedItem } from '../../src/lib/news/feeds.ts';
import { scoreImportance } from '../../src/lib/news/importance.ts';
import { deriveReleaseWatch, mergeNews } from '../../src/lib/news/retention.ts';
import { parseNewsItem, parseNewsItems } from '../../src/lib/news/validate.ts';
import { loadSources } from './load-sources.mjs';
import { writeIfChanged } from './write-data.mjs';

/**
 * @typedef {import('../../src/lib/news/types.ts').NewsSource} NewsSource
 * @typedef {import('../../src/lib/news/types.ts').NewsItem} NewsItem
 * @typedef {import('../../src/lib/news/feeds.ts').RawFeedItem} RawFeedItem
 * @typedef {{ sourceId: string; message: string }} CollectionFailure
 * @typedef {{ items: NewsItem[]; releases: import('../../src/lib/news/types.ts').ReleaseWatchItem[]; fetchedSourceIds: string[]; failures: CollectionFailure[] }} CollectionResult
 * @typedef {(url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>} FetchLike
 */

const DEFAULT_TIMEOUT_MS = 15_000;

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' });

/** @param {unknown} value @returns {unknown[]} */
function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** @param {unknown} value @returns {string | undefined} */
function textOf(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && typeof (/** @type {Record<string, unknown>} */ (value))['#text'] === 'string') return /** @type {Record<string, string>} */ (value)['#text'];
  return undefined;
}

/** @param {any} entry @returns {string | undefined} */
function atomLinkHref(entry) {
  const links = /** @type {any[]} */ (toArray(entry.link));
  const alternate = links.find((link) => !link?.['@_rel'] || link['@_rel'] === 'alternate') ?? links[0];
  return alternate?.['@_href'];
}

/**
 * Parses RSS 2.0 <item> or Atom <entry> elements into loosely-typed raw feed items.
 * @param {string} xmlText
 * @returns {RawFeedItem[]}
 */
export function parseFeedXml(xmlText) {
  let doc;
  try {
    doc = xmlParser.parse(xmlText);
  } catch {
    return [];
  }

  if (doc?.rss?.channel) {
    return /** @type {any[]} */ (toArray(doc.rss.channel.item)).map((item) => ({
      title: textOf(item.title),
      url: textOf(item.link),
      publishedDate: textOf(item.pubDate),
      summary: textOf(item.description),
    }));
  }

  if (doc?.feed?.entry) {
    return /** @type {any[]} */ (toArray(doc.feed.entry)).map((entry) => ({
      title: textOf(entry.title),
      url: atomLinkHref(entry),
      publishedDate: textOf(entry.updated) ?? textOf(entry.published),
      summary: textOf(entry.summary) ?? textOf(entry.content),
    }));
  }

  return [];
}

/**
 * @param {import('../../src/lib/news/feeds.ts').NormalizedCandidate} candidate
 * @param {NewsSource} source
 * @returns {NewsItem}
 */
function buildNewsItem(candidate, source) {
  const classified = classifyNews({ sourceId: source.id, sourceTags: source.tags, title: candidate.title, summary: candidate.summary });
  const importance = scoreImportance({ sourcePriority: source.priority, title: candidate.title, architectureShift: classified.architectureShift, releaseRelated: classified.releaseRelated, domain: classified.domain });
  return parseNewsItem({
    id: candidate.id,
    title: candidate.title,
    summary: candidate.summary,
    source: source.name,
    sourceId: source.id,
    url: candidate.url,
    publishedDate: candidate.publishedDate,
    domain: classified.domain,
    topics: classified.topics,
    importance,
    architectureShift: classified.architectureShift,
    releaseRelated: classified.releaseRelated,
    releaseProject: classified.releaseProject,
    releaseVersion: classified.releaseVersion,
  });
}

/**
 * @param {NewsSource} source
 * @param {FetchLike} fetchImpl
 * @param {AbortSignal} signal
 * @returns {Promise<NewsItem[]>}
 */
async function fetchSourceItems(source, fetchImpl, signal) {
  const response = await fetchImpl(/** @type {string} */ (source.feedUrl), { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();

  /** @type {NewsItem[]} */
  const items = [];
  for (const raw of parseFeedXml(text)) {
    const candidate = normalizeFeedItem(raw, source);
    if (!candidate) continue;
    try {
      items.push(buildNewsItem(candidate, source));
    } catch {
      // Malformed after classification (should not normally happen) — skip rather than fail the whole source.
    }
  }
  return items;
}

/**
 * Fetches every enabled, feed-bearing source independently. One failure never blocks the rest,
 * and prior valid items always survive the merge even if every source fails this run.
 * @param {{ sources: NewsSource[]; existingItems?: NewsItem[]; fetchImpl?: FetchLike; asOf?: Date; timeoutMs?: number }} options
 * @returns {Promise<CollectionResult>}
 */
export async function collectRadar({ sources, existingItems = [], fetchImpl = /** @type {FetchLike} */ (/** @type {unknown} */ (fetch)), asOf = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS }) {
  /** @type {string[]} */
  const fetchedSourceIds = [];
  /** @type {CollectionFailure[]} */
  const failures = [];
  /** @type {NewsItem[]} */
  const incoming = [];

  for (const source of sources) {
    if (!source.enabled || !source.feedUrl) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      incoming.push(...(await fetchSourceItems(source, fetchImpl, controller.signal)));
      fetchedSourceIds.push(source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`[news:collect] source "${source.id}" failed: ${message}`);
      failures.push({ sourceId: source.id, message });
    } finally {
      clearTimeout(timer);
    }
  }

  const items = mergeNews(existingItems, incoming, asOf);
  const releases = deriveReleaseWatch(items);
  return { items, releases, fetchedSourceIds, failures };
}

async function main() {
  const sourcesPath = new URL('../../data/news-sources.yaml', import.meta.url);
  const newsPath = new URL('../../data/news.json', import.meta.url);
  const releasesPath = new URL('../../data/releases.json', import.meta.url);

  const sources = await loadSources(sourcesPath);

  /** @type {NewsItem[]} */
  let existingItems = [];
  try {
    existingItems = parseNewsItems(JSON.parse(await readFile(newsPath, 'utf8')));
  } catch (error) {
    console.error(`[news:collect] could not read existing data/news.json, starting from empty: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  const result = await collectRadar({ sources, existingItems, asOf: new Date() });
  const attempted = sources.filter((source) => source.enabled && source.feedUrl).length;

  if (result.fetchedSourceIds.length === 0) {
    console.log(`[news:collect] all ${attempted} source(s) failed; retaining prior data, no writes.`);
    return;
  }

  const newsChanged = await writeIfChanged(newsPath, result.items);
  const releasesChanged = await writeIfChanged(releasesPath, result.releases);
  console.log(`[news:collect] fetched ${result.fetchedSourceIds.length}/${attempted} source(s), ${result.failures.length} failed, ${result.items.length} item(s) retained (news ${newsChanged ? 'updated' : 'unchanged'}, releases ${releasesChanged ? 'updated' : 'unchanged'}).`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error('[news:collect] fatal error', error);
    process.exitCode = 1;
  });
}
