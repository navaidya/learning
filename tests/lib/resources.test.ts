import { describe, expect, it } from 'vitest';
import { domains } from '../../src/lib/domains';
import { getDomainResources, groupResourcesByType, parseDomainResources, resourceTypes } from '../../src/lib/resources';

describe('resource validation', () => {
  it('rejects a resource with a non-http(s) url', () => {
    expect(() => parseDomainResources({
      kubernetes: { summary: 'x', latest: [], resources: [{ title: 'x', url: 'ftp://example.test', type: 'docs', description: 'x' }] },
    })).toThrow();
  });

  it('rejects an unknown resource type', () => {
    expect(() => parseDomainResources({
      kubernetes: { summary: 'x', latest: [], resources: [{ title: 'x', url: 'https://example.test', type: 'tweet', description: 'x' }] },
    })).toThrow();
  });

  it('defaults latest and resources to empty arrays when omitted', () => {
    const parsed = parseDomainResources({ kubernetes: { summary: 'Only a summary' } });
    expect(parsed.kubernetes.latest).toEqual([]);
    expect(parsed.kubernetes.resources).toEqual([]);
  });
});

describe('curated resource data', () => {
  it('covers every domain in the skill map', () => {
    const missing = domains.filter((domain) => !getDomainResources(domain.slug)).map((domain) => domain.slug);
    expect(missing).toEqual([]);
  });

  it('gives every domain a summary and at least three resources', () => {
    for (const domain of domains) {
      const entry = getDomainResources(domain.slug)!;
      expect(entry.summary.length, `${domain.slug} summary`).toBeGreaterThan(0);
      expect(entry.resources.length, `${domain.slug} resources`).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses only https urls and never duplicates a url within a domain', () => {
    for (const domain of domains) {
      const urls = getDomainResources(domain.slug)!.resources.map((resource) => resource.url);
      for (const url of urls) expect(url, `${domain.slug} url`).toMatch(/^https:\/\//);
      expect(new Set(urls).size, `${domain.slug} duplicate urls`).toBe(urls.length);
    }
  });

  it('returns undefined for a domain with no curated resources', () => {
    expect(getDomainResources('not-a-real-domain')).toBeUndefined();
  });
});

describe('groupResourcesByType', () => {
  it('groups by type and drops empty groups, following the declared type order', () => {
    const groups = groupResourcesByType([
      { title: 'b', url: 'https://example.test/b', type: 'video', description: 'b' },
      { title: 'a', url: 'https://example.test/a', type: 'docs', description: 'a' },
      { title: 'c', url: 'https://example.test/c', type: 'docs', description: 'c' },
    ]);
    expect(groups.map((group) => group.type)).toEqual(['docs', 'video']);
    expect(groups[0].resources).toHaveLength(2);
  });

  it('returns no groups for an empty resource list', () => {
    expect(groupResourcesByType([])).toEqual([]);
  });

  it('declares every type used in the curated data', () => {
    for (const domain of domains) {
      for (const resource of getDomainResources(domain.slug)!.resources) {
        expect(resourceTypes, `${domain.slug} → ${resource.title}`).toContain(resource.type);
      }
    }
  });
});
