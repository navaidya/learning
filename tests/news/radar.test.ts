import { describe, expect, it, vi } from 'vitest';

vi.mock('../../data/news.json', () => ({
  default: [
    { id: 'k1', title: 'Kubernetes v1.37 GA', source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/k1', publishedDate: '2026-08-05T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'high', architectureShift: false, releaseRelated: true },
    { id: 'o1', title: 'OpenTelemetry Collector 1.2 released', source: 'OpenTelemetry', sourceId: 'opentelemetry', url: 'https://opentelemetry.io/blog/o1', publishedDate: '2026-08-04T00:00:00Z', domain: 'opentelemetry', topics: [], importance: 'critical', architectureShift: false, releaseRelated: true },
    { id: 'a1', title: 'Gateway API replaces legacy Ingress', source: 'Kubernetes', sourceId: 'kubernetes', url: 'https://kubernetes.io/blog/a1', publishedDate: '2026-08-03T00:00:00Z', domain: 'kubernetes', topics: [], importance: 'critical', architectureShift: true, releaseRelated: false },
    { id: 't1', title: 'Terraform 1.16 beta', source: 'Terraform', sourceId: 'terraform', url: 'https://github.com/hashicorp/terraform/releases/tag/t1', publishedDate: '2026-08-02T00:00:00Z', domain: 'terraform', topics: [], importance: 'medium', architectureShift: false, releaseRelated: true },
  ],
}));

vi.mock('../../data/releases.json', () => ({
  default: [
    { project: 'kubernetes', version: 'v1.37.0', publishedDate: '2026-08-05T00:00:00Z', url: 'https://kubernetes.io/blog/k1', sourceId: 'kubernetes' },
  ],
}));

describe('getEngineeringRadarModel', () => {
  it('filters items into the kubernetes category', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', new Date('2026-08-10'));
    expect(model.items.map((item) => item.id).sort()).toEqual(['a1', 'k1']);
  });

  it('surfaces an architecture-shift item above a more recent routine item in a category feed', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', new Date('2026-08-10'));
    // a1 (architecture shift, Aug 3) should outrank k1 (routine, Aug 5) despite being older.
    expect(model.items[0].id).toBe('a1');
  });

  it('filters items into the infrastructure category, which also includes kubernetes per the domain mapping', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('infrastructure', new Date('2026-08-10'));
    expect(model.items.map((item) => item.id).sort()).toEqual(['a1', 'k1', 't1']);
  });

  it('sorts the for-you category by relevance', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('for-you', new Date('2026-08-10'));
    expect(model.items[0].id).toBe('o1');
  });

  it('includes derived release watch data', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('kubernetes', new Date('2026-08-10'));
    expect(model.releases).toHaveLength(1);
    expect(model.releases[0].project).toBe('kubernetes');
  });

  it('returns a safe empty state for a category with no matches', async () => {
    const { getEngineeringRadarModel } = await import('../../src/lib/news/radar');
    const model = await getEngineeringRadarModel('platform-engineering', new Date('2026-08-10'));
    expect(model.items).toEqual([]);
  });
});

describe('getRadarSummary', () => {
  it('caps the dashboard summary at five items', async () => {
    const { getRadarSummary } = await import('../../src/lib/news/radar');
    const summary = await getRadarSummary(new Date('2026-08-10'));
    expect(summary.items.length).toBeLessThanOrEqual(5);
  });
});
