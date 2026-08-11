import { describe, expect, it } from 'vitest';

describe('scoreImportance', () => {
  it('scores a high-priority general-availability release as high', async () => {
    const { scoreImportance } = await import('../../src/lib/news/importance');
    expect(scoreImportance({ sourcePriority: 1, title: 'Kubernetes v1.35 generally available', architectureShift: false, releaseRelated: true })).toBe('high');
  });

  it('scores routine community content from a lower-priority source as low', async () => {
    const { scoreImportance } = await import('../../src/lib/news/importance');
    expect(scoreImportance({ sourcePriority: 2, title: 'Community office hours', architectureShift: false, releaseRelated: false })).toBe('low');
  });

  it('scores an architecture shift plus a GA release from a top source as critical', async () => {
    const { scoreImportance } = await import('../../src/lib/news/importance');
    expect(scoreImportance({ sourcePriority: 1, title: 'Gateway API v1.6 generally available, replacing the legacy Ingress API', architectureShift: true, releaseRelated: true })).toBe('critical');
  });

  it('scores a routine non-GA release from a mid-priority source as medium', async () => {
    const { scoreImportance } = await import('../../src/lib/news/importance');
    expect(scoreImportance({ sourcePriority: 2, title: 'Cilium 1.21.0-pre.0 released', architectureShift: false, releaseRelated: true })).toBe('medium');
  });
});
