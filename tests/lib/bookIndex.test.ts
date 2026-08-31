import { describe, expect, it } from 'vitest';
import { createBookIndex } from '../../src/lib/bookIndex';

const catalog = [
  { slug: 'kubernetes', title: 'Kubernetes', description: 'Cluster architecture and operations.', featured: 1 },
  { slug: 'aiops', title: 'AIOps', description: 'Evidence-led operational assistance.', featured: 2 },
];

describe('createBookIndex', () => {
  it('lists a note in each explicit topic without duplicating it within a hub', () => {
    const index = createBookIndex([
      { id: 'ai-troubleshooting', data: { title: 'AI troubleshooting', topics: ['aiops', 'kubernetes', 'aiops'] } },
    ], catalog);

    expect(index.hubs.map((hub) => [hub.slug, hub.entries.map((entry) => entry.id)])).toEqual([
      ['aiops', ['ai-troubleshooting']],
      ['kubernetes', ['ai-troubleshooting']],
    ]);
  });

  it('uses domain when a note has no explicit topics and orders notes by title', () => {
    const index = createBookIndex([
      { id: 'z', data: { title: 'Zulu', domain: 'kubernetes' } },
      { id: 'a', data: { title: 'Alpha', domain: 'kubernetes' } },
    ], catalog);

    expect(index.hubs.find((hub) => hub.slug === 'kubernetes')?.entries.map((entry) => entry.id)).toEqual(['a', 'z']);
  });

  it('normalizes blank and mixed-case topic values and assigns unclassified notes to Other', () => {
    const index = createBookIndex([
      { id: 'one', data: { title: 'One', topics: [' Kubernetes ', '', 'AIOPS'] } },
      { id: 'two', data: { title: 'Two' } },
    ], catalog);

    expect(index.entries.find((entry) => entry.id === 'one')?.topics.map((topic) => topic.slug)).toEqual(['aiops', 'kubernetes']);
    expect(index.entries.find((entry) => entry.id === 'two')?.topics.map((topic) => topic.slug)).toEqual(['other']);
  });

  it('exposes only configured Start Here ids that resolve to known entries', () => {
    const index = createBookIndex([
      { id: 'known', data: { title: 'Known', domain: 'kubernetes' } },
    ], catalog, ['missing', 'known']);

    expect(index.startHere.map((entry) => entry.id)).toEqual(['known']);
  });
});
