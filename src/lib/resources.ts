import { parse } from 'yaml';
import { z } from 'zod';
// Imported as raw text so Vite inlines the data at build time; reading from disk
// at runtime breaks once Astro bundles this module into dist/.
import resourcesYaml from '../../data/resources.yaml?raw';

export const resourceTypes = ['docs', 'course', 'video', 'podcast', 'newsletter', 'book', 'tool', 'community', 'certification'] as const;
export type ResourceType = (typeof resourceTypes)[number];

export interface LearningResource {
  title: string;
  url: string;
  type: ResourceType;
  description: string;
}

export interface DomainResources {
  summary: string;
  latest: string[];
  resources: LearningResource[];
}

const learningResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().refine((value) => /^https?:\/\//i.test(value), 'must be an http(s) URL'),
  type: z.enum(resourceTypes),
  description: z.string().min(1),
});

const domainResourcesSchema = z.object({
  summary: z.string().min(1),
  latest: z.array(z.string().min(1)).default([]),
  resources: z.array(learningResourceSchema).default([]),
});

const resourcesFileSchema = z.record(z.string(), domainResourcesSchema);

export function parseDomainResources(value: unknown): Record<string, DomainResources> {
  return resourcesFileSchema.parse(value);
}

let cached: Record<string, DomainResources> | undefined;

function loadAll(): Record<string, DomainResources> {
  if (!cached) cached = parseDomainResources(parse(resourcesYaml) ?? {});
  return cached;
}

/** Returns curated resources for a domain, or undefined when none are curated yet. */
export function getDomainResources(slug: string): DomainResources | undefined {
  return loadAll()[slug];
}

/** Groups a domain's resources by type, preserving the order declared in `resourceTypes`. */
export function groupResourcesByType(resources: LearningResource[]): { type: ResourceType; resources: LearningResource[] }[] {
  return resourceTypes
    .map((type) => ({ type, resources: resources.filter((resource) => resource.type === type) }))
    .filter((group) => group.resources.length > 0);
}
