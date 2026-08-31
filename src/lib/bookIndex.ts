import type { TopicCatalogEntry } from './bookTopics';

export interface BookSourceEntry {
  id: string;
  data: {
    title: string;
    domain?: string;
    topics?: string[];
    published?: Date | string;
  };
}

export interface BookIndexEntry extends BookSourceEntry {
  topics: TopicCatalogEntry[];
}

export interface TopicHub extends TopicCatalogEntry {
  entries: BookIndexEntry[];
}

export interface BookIndex {
  entries: BookIndexEntry[];
  hubs: TopicHub[];
  startHere: BookIndexEntry[];
}

export interface KnowledgeDashboardModel {
  startHere: BookIndexEntry[];
  featuredHubs: TopicHub[];
  recentlyAdded: BookIndexEntry[];
}

const otherTopic: TopicCatalogEntry = {
  slug: 'other',
  title: 'Other',
  description: 'Additional engineering notes.',
};

export function normalizeTopic(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generatedTopic(slug: string): TopicCatalogEntry {
  return {
    slug,
    title: slug.split('-').map((part) => part === 'aiops' ? 'AIOps' : part[0]?.toUpperCase() + part.slice(1)).join(' '),
    description: 'Related engineering notes.',
  };
}

export function getTopicsForEntry(entry: BookSourceEntry, catalog: TopicCatalogEntry[]): TopicCatalogEntry[] {
  const catalogBySlug = new Map(catalog.map((topic) => [normalizeTopic(topic.slug), topic]));
  const suppliedTopics = entry.data.topics?.length ? entry.data.topics : entry.data.domain ? [entry.data.domain] : [];
  const slugs = [...new Set(suppliedTopics.map(normalizeTopic).filter(Boolean))];
  const resolved = (slugs.length ? slugs : ['other']).map((slug) => catalogBySlug.get(slug) ?? (slug === 'other' ? otherTopic : generatedTopic(slug)));
  return resolved.sort((left, right) => left.title.localeCompare(right.title));
}

export function createBookIndex(entries: BookSourceEntry[], catalog: TopicCatalogEntry[], startHereIds: string[] = []): BookIndex {
  const indexedEntries = entries
    .map((entry) => ({ ...entry, topics: getTopicsForEntry(entry, catalog) }))
    .sort((left, right) => left.data.title.localeCompare(right.data.title));
  const hubs = [...new Map(indexedEntries.flatMap((entry) => entry.topics.map((topic) => [topic.slug, topic]))).entries()]
    .map(([slug, topic]) => ({ ...topic, slug, entries: indexedEntries.filter((entry) => entry.topics.some((item) => item.slug === slug)) }))
    .sort((left, right) => left.title.localeCompare(right.title));
  const entriesById = new Map(indexedEntries.map((entry) => [entry.id, entry]));

  return { entries: indexedEntries, hubs, startHere: startHereIds.flatMap((id) => entriesById.get(id) ?? []) };
}

export function createKnowledgeDashboardModel(index: BookIndex): KnowledgeDashboardModel {
  return {
    startHere: index.startHere,
    featuredHubs: index.hubs
      .filter((hub) => hub.featured !== undefined)
      .sort((left, right) => left.featured! - right.featured!),
    recentlyAdded: index.entries.slice().sort((left, right) => {
      const leftPublished = left.data.published ? new Date(left.data.published).getTime() : Number.NEGATIVE_INFINITY;
      const rightPublished = right.data.published ? new Date(right.data.published).getTime() : Number.NEGATIVE_INFINITY;
      return rightPublished - leftPublished || right.id.localeCompare(left.id);
    }).slice(0, 5),
  };
}
