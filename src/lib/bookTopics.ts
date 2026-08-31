import { parse } from 'yaml';
import { z } from 'zod';
import bookTopicsYaml from '../../data/book-topics.yaml?raw';

const topicSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  featured: z.number().int().positive().optional(),
});

const catalogSchema = z.object({
  topics: z.array(topicSchema),
  startHere: z.array(z.string().min(1)),
});

export type TopicCatalogEntry = z.infer<typeof topicSchema>;
export type BookTopicCatalog = z.infer<typeof catalogSchema>;

export function parseBookTopicCatalog(value: unknown): BookTopicCatalog {
  return catalogSchema.parse(value);
}

let cached: BookTopicCatalog | undefined;

export function getBookTopicCatalog(): BookTopicCatalog {
  if (!cached) cached = parseBookTopicCatalog(parse(bookTopicsYaml));
  return cached;
}
