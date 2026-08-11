import { describe, expect, it, vi } from 'vitest';

vi.mock('../../data/news.json', () => ({
  default: [
    { id: 'k1', title: 'Kubernetes v1.37 GA', source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/k1', publishedDate: '2026-08-05T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'high', architectureShift: false, releaseRelated: true },
    { id: 'o1', title: 'OpenTelemetry Collector 1.2 released', source: 'OpenTelemetry', sourceId: 'opentelemetry', url: 'https://opentelemetry.io/blog/o1', publishedDate: '2026-08-04T00:00:00Z', domain: 'opentelemetry', topics: [], importance: 'critical', architectureShift: false, releaseRelated: true },
    { id: 'a1', title: 'Gateway API replaces legacy Ingress', source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/a1', publishedDate: '2026-08-03T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'critical', architectureShift: true, releaseRelated: false },
    { id: 'a2', title: 'Dynamic Resource Allocation graduates', source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/a2', publishedDate: '2026-06-20T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'critical', architectureShift: true, releaseRelated: false },
    { id: 't1', title: 'Terraform 1.16 beta', source: 'Terraform', sourceId: 'terraform', url: 'https://github.com/hashicorp/terraform/releases/tag/t1', publishedDate: '2026-08-02T00:00:00Z', domain: 'terraform', topics: [], importance: 'medium', architectureShift: false, releaseRelated: true },
    { id: 't2', title: 'Terraform 1.15 beta', source: 'Terraform', sourceId: 'terraform', url: 'https://github.com/hashicorp/terraform/releases/tag/t2', publishedDate: '2026-07-01T00:00:00Z', domain: 'terraform', topics: [], importance: 'medium', architectureShift: false, releaseRelated: true },
  ],
}));

vi.mock('../../data/releases.json', () => ({
  default: [
    { project: 'kubernetes', version: 'v1.37.0', publishedDate: '2026-08-05T00:00:00Z', url: 'https://kubernetes.io/blog/k1', sourceId: 'kubernetes' },
  ],
}));

vi.mock('../../data/radar-meta.json', () => ({
  default: { collectedAt: '2026-08-09T12:00:00Z', sourceIds: ['kubernetes', 'opentelemetry', 'terraform'], failedSourceIds: ['grafana'], itemCount: 6 },
}));

const asOf = new Date('2026-08-10');

describe('getEngineeringRadarModel', () => {
  it('filters items into the kubernetes category', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    expect(model.items.map((item) => item.id).sort()).toEqual(['a1', 'a2', 'k1']);
  });

  it('surfaces a still-current architecture-shift item above a more recent routine item in a category feed', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    // a1 (architecture shift, Aug 3) should outrank k1 (routine, Aug 5) despite being older.
    expect(model.items[0].id).toBe('a1');
  });

  it('stops pinning an architecture-shift item once it is no longer current', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    const ids = model.items.map((item) => item.id);
    // a2 is a shift too, but from June — it sinks below the fresher k1 instead of pinning forever.
    expect(ids.indexOf('a2')).toBeGreaterThan(ids.indexOf('k1'));
  });

  it('filters items into the infrastructure category, which also includes kubernetes per the domain mapping', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('infrastructure', asOf);
    expect(model.items.map((item) => item.id).sort()).toEqual(['a1', 'a2', 'k1', 't1', 't2']);
  });

  it('sorts the for-you category by relevance', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('for-you', asOf);
    expect(model.items[0].id).toBe('o1');
  });

  it('ranks the fresher of two otherwise identical items first in for-you', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('for-you', asOf);
    const ids = model.items.map((item) => item.id);
    // t1 and t2 share a domain and importance, so only recency separates them.
    expect(ids.indexOf('t1')).toBeLessThan(ids.indexOf('t2'));
  });

  it('exposes a strictly chronological latest list regardless of ranking', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    expect(model.latest.map((item) => item.id)).toEqual(['k1', 'a1', 'a2']);
  });

  it('reports freshness from collection metadata and the scoped items', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('for-you', asOf);
    expect(model.freshness.collectedAt).toBe('2026-08-09T12:00:00Z');
    expect(model.freshness.sourceCount).toBe(3);
    expect(model.freshness.failedSourceCount).toBe(1);
    expect(model.freshness.lastPublishedDate).toBe('2026-08-05T00:00:00Z');
    expect(model.freshness.totalCount).toBe(6);
    // k1 (5 days) and o1 (6 days) are inside the 7-day window; a1 at exactly 7 days is not.
    expect(model.freshness.newCount).toBe(2);
  });

  it('counts freshness against the category scope, not the whole corpus', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    expect(model.freshness.totalCount).toBe(3);
    expect(model.freshness.newCount).toBe(1);
  });

  it('includes derived release watch data', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', asOf);
    expect(model.releases).toHaveLength(1);
    expect(model.releases[0].project).toBe('kubernetes');
  });

  it('returns a safe empty state for a category with no matches', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('platform-engineering', asOf);
    expect(model.items).toEqual([]);
    expect(model.latest).toEqual([]);
    expect(model.freshness.totalCount).toBe(0);
    expect(model.freshness.lastPublishedDate).toBeUndefined();
  });
});

describe('getRadarSummary', () => {
  it('caps the dashboard summary at five items', async () => {
    const { getRadarSummary } = await import('../../src/lib/news/radar');
    const summary = await getRadarSummary(asOf);
    expect(summary.items.length).toBeLessThanOrEqual(5);
  });

  it('carries freshness through to the dashboard', async () => {
    const { getRadarSummary } = await import('../../src/lib/news/radar');
    const summary = await getRadarSummary(asOf);
    expect(summary.freshness.collectedAt).toBe('2026-08-09T12:00:00Z');
    expect(summary.freshness.newCount).toBe(2);
  });
});
