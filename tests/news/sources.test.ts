import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { newsCategories } from '../../src/lib/news/types';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function loadRawSources(): Promise<unknown> {
  return parse(await readFile(path.join(repoRoot, 'data/news-sources.yaml'), 'utf8'));
}

describe('data/news-sources.yaml', () => {
  it('validates against the source schema', async () => {
    const { parseNewsSources } = await import('../../src/lib/news/validate');
    const raw = await loadRawSources();
    expect(() => parseNewsSources(raw)).not.toThrow();
  });

  it('gives every source a unique id', async () => {
    const { parseNewsSources } = await import('../../src/lib/news/validate');
    const ids = parseNewsSources(await loadRawSources()).map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every enabled source at a distinct https feed', async () => {
    const { parseNewsSources } = await import('../../src/lib/news/validate');
    const enabled = parseNewsSources(await loadRawSources()).filter((source) => source.enabled);
    const feedUrls = enabled.map((source) => source.feedUrl);
    expect(feedUrls.every((url) => url?.startsWith('https://'))).toBe(true);
    expect(new Set(feedUrls).size).toBe(feedUrls.length);
  });

  it('covers every Radar category with at least one enabled source', async () => {
    const { parseNewsSources } = await import('../../src/lib/news/validate');
    const enabled = parseNewsSources(await loadRawSources()).filter((source) => source.enabled);
    for (const category of newsCategories) {
      expect(enabled.some((source) => source.category === category), `no enabled source for ${category}`).toBe(true);
    }
  });

  it('declares an explicit default domain for every enabled source, so terse release feeds never fall back to a guess', async () => {
    const { parseNewsSources } = await import('../../src/lib/news/validate');
    const { sourceDefaultDomains } = await import('../../src/lib/news/classifier');
    const enabled = parseNewsSources(await loadRawSources()).filter((source) => source.enabled);
    const missing = enabled.filter((source) => !(source.id in sourceDefaultDomains)).map((source) => source.id);
    expect(missing).toEqual([]);
  });

  it('maps every default domain onto a skill-map domain the Radar can link to', async () => {
    const { sourceDefaultDomains } = await import('../../src/lib/news/classifier');
    const { domains } = await import('../../src/lib/domains');
    const slugs = new Set(domains.map((domain) => domain.slug));
    // "infrastructure" is the deliberate catch-all for broad ecosystem sources with no single domain.
    const unmapped = Object.entries(sourceDefaultDomains).filter(([, domain]) => domain !== 'infrastructure' && !slugs.has(domain));
    expect(unmapped).toEqual([]);
  });
});
