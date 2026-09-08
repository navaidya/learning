import { readFile } from 'node:fs/promises';
import { collectRadar } from './collect.mjs';
import { loadSources } from './load-sources.mjs';
import { writeIfChanged } from './write-data.mjs';
import { parseNewsItems } from '../../src/lib/news/validate.ts';

const sources = await loadSources(new URL('../../data/ai-watch-sources.yaml', import.meta.url));
const itemsPath = new URL('../../data/ai-watch.json', import.meta.url);
const metaPath = new URL('../../data/ai-watch-meta.json', import.meta.url);
/** @type {import('../../src/lib/news/types.ts').NewsItem[]} */
let existingItems = [];
try {
  existingItems = parseNewsItems(JSON.parse(await readFile(itemsPath, 'utf8')));
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
}
const asOf = new Date();
const result = await collectRadar({ sources, existingItems, asOf });
if (result.fetchedSourceIds.length) await writeIfChanged(itemsPath, result.items);
// Record failed attempts even when every feed is unavailable; preserve previous content.
await writeIfChanged(metaPath, {
  collectedAt: asOf.toISOString(),
  sourceIds: result.fetchedSourceIds,
  failedSourceIds: result.failures.map(failure => failure.sourceId),
  itemCount: result.fetchedSourceIds.length ? result.items.length : existingItems.length,
});
console.log('[ai-watch] checked ' + result.fetchedSourceIds.length + '/' + sources.length + ' feeds; failures: ' + result.failures.length);
