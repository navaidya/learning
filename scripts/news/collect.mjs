import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { classifyNews } from '../../src/lib/news/classifier.ts';
import { matchesSourceFilter, normalizeFeedItem } from '../../src/lib/news/feeds.ts';
import { scoreImportance } from '../../src/lib/news/importance.ts';
import { deriveReleaseWatch, mergeNews } from '../../src/lib/news/retention.ts';
import { parseNewsItem, parseNewsItems, parseRadarCollectionMeta } from '../../src/lib/news/validate.ts';
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
/** Sources are independent, so fetch a few at a time — bounded so a long source list stays polite. */
const DEFAULT_CONCURRENCY = 6;

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
    if (!matchesSourceFilter(`${candidate.title} ${candidate.summary ?? ''}`, source)) continue;
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
 * @param {{ sources: NewsSource[]; existingItems?: NewsItem[]; fetchImpl?: FetchLike; asOf?: Date; timeoutMs?: number; concurrency?: number }} options
 * @returns {Promise<CollectionResult>}
 */
export async function collectRadar({ sources, existingItems = [], fetchImpl = /** @type {FetchLike} */ (/** @type {unknown} */ (fetch)), asOf = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS, concurrency = DEFAULT_CONCURRENCY }) {
  const active = sources.filter((source) => source.enabled && source.feedUrl);

  /** @type {({ ok: true; items: NewsItem[] } | { ok: false; message: string })[]} */
  const outcomes = new Array(active.length);

  let cursor = 0;
  const worker = async () => {
    while (cursor < active.length) {
      const index = cursor++;
      const source = active[index];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        outcomes[index] = { ok: true, items: await fetchSourceItems(source, fetchImpl, controller.signal) };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        console.error(`[news:collect] source "${source.id}" failed: ${message}`);
        outcomes[index] = { ok: false, message };
      } finally {
        clearTimeout(timer);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, active.length)) }, worker));

  /** @type {string[]} */
  const fetchedSourceIds = [];
  /** @type {CollectionFailure[]} */
  const failures = [];
  /** @type {NewsItem[]} */
  const incoming = [];

  // Reassembled in source order so the result is identical whatever order the fetches finished in.
  active.forEach((source, index) => {
    const outcome = outcomes[index];
    if (outcome.ok) {
      fetchedSourceIds.push(source.id);
      incoming.push(...outcome.items);
    } else {
      failures.push({ sourceId: source.id, message: outcome.message });
    }
  });

  // Previously-collected items are re-checked against the current source config, so tightening a
  // source's keyword filter takes effect on the next run instead of leaving old noise in place.
  // Items whose source has since been removed are kept rather than silently dropped.
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const retainedExisting = existingItems.filter((item) => {
    const source = sourceById.get(item.sourceId);
    return !source || matchesSourceFilter(`${item.title} ${item.summary ?? ''}`, source);
  });

  const items = mergeNews(retainedExisting, incoming, asOf);
  const releases = deriveReleaseWatch(items);
  return { items, releases, fetchedSourceIds, failures };
}

async function main() {
  const sourcesPath = new URL('../../data/news-sources.yaml', import.meta.url);
  const newsPath = new URL('../../data/news.json', import.meta.url);
  const releasesPath = new URL('../../data/releases.json', import.meta.url);
  const metaPath = new URL('../../data/radar-meta.json', import.meta.url);

  const sources = await loadSources(sourcesPath);

  /** @type {NewsItem[]} */
  let existingItems = [];
  try {
    existingItems = parseNewsItems(JSON.parse(await readFile(newsPath, 'utf8')));
  } catch (error) {
    console.error(`[news:collect] could not read existing data/news.json, starting from empty: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  const collectedAt = new Date();
  const result = await collectRadar({ sources, existingItems, asOf: collectedAt });
  const attempted = sources.filter((source) => source.enabled && source.feedUrl).length;

  if (result.fetchedSourceIds.length === 0) {
    console.log(`[news:collect] all ${attempted} source(s) failed; retaining prior data, no writes.`);
    return;
  }

  const newsChanged = await writeIfChanged(newsPath, result.items);
  const releasesChanged = await writeIfChanged(releasesPath, result.releases);
  // Always rewritten, even when no item changed: "we checked and nothing is new" is itself
  // the freshness signal the Radar page reports.
  await writeIfChanged(metaPath, parseRadarCollectionMeta({
    collectedAt: collectedAt.toISOString(),
    sourceIds: result.fetchedSourceIds,
    failedSourceIds: result.failures.map((failure) => failure.sourceId),
    itemCount: result.items.length,
  }));
  console.log(`[news:collect] fetched ${result.fetchedSourceIds.length}/${attempted} source(s), ${result.failures.length} failed, ${result.items.length} item(s) retained (news ${newsChanged ? 'updated' : 'unchanged'}, releases ${releasesChanged ? 'updated' : 'unchanged'}).`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error('[news:collect] fatal error', error);
    process.exitCode = 1;
  });
}
