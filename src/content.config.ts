import { defineCollection } from 'astro:content';
import { z, type ZodTypeAny } from 'astro/zod';
import { glob } from 'astro/loaders';

const status = z.enum(['not_started', 'learning', 'practicing', 'review', 'mastered']).default('not_started');
const codingInterviewStatus = z.enum(['planned', 'ready', 'in_progress', 'completed']).default('planned');
const codingInterviewLanguage = z.enum(['java', 'python']);
const codingInterviewLabPath = z.string().regex(/^coding-labs\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a direct coding-labs directory');
const common = { title: z.string(), domain: z.string().optional(), topic: z.string().optional(), topics: z.array(z.string()).default([]), status, importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'), confidence: z.number().min(0).max(5).optional(), coverage: z.number().min(0).max(100).optional(), last_reviewed: z.coerce.date().optional(), next_review: z.coerce.date().optional(), published: z.coerce.date().optional(), labs_completed: z.number().int().min(0).default(0), labs_required: z.number().int().min(0).default(0), questions_correct: z.number().int().min(0).default(0), questions_attempted: z.number().int().min(0).default(0), tags: z.array(z.string()).default([]) };
const content = <S extends ZodTypeAny>(base: string, schema: S) => ({ loader: glob({ pattern: '**/*.{md,mdx}', base }), schema });
export const collections = {
  book: defineCollection(content('./content/book', z.object(common))),
  labs: defineCollection(content('./content/labs', z.object({ title: z.string(), domain: z.string().optional(), difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'), status: z.enum(['planned', 'in_progress', 'completed']).default('planned'), completed: z.boolean().default(false), completed_date: z.coerce.date().optional(), topics: z.array(z.string()).default([]) }))),
  projects: defineCollection(content('./content/projects', z.object({ title: z.string(), status: z.enum(['active', 'paused', 'completed']).default('active'), progress: z.number().min(0).max(100).default(0), started: z.coerce.date().optional(), domains: z.array(z.string()).default([]) }))),
  inbox: defineCollection(content('./content/inbox', z.object({ title: z.string(), captured: z.coerce.date().optional(), type: z.string().default('note') }))),
  'system-design': defineCollection(content('./content/system-design', z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().int().min(1),
    difficulty: z.enum(['intermediate', 'advanced']),
    interviewMinutes: z.number().int().min(30).max(60),
    scaleChallenge: z.string(),
    aiFocus: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
  }))),
  'system-design-deployments': defineCollection(content('./content/system-design-deployments', z.object({
    title: z.string(),
    summary: z.string(),
    systemDesign: z.string().regex(/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().min(1),
    deploymentStyle: z.string(),
    availabilityTarget: z.string(),
    regions: z.enum(['single-region', 'multi-region', 'global']),
    tags: z.array(z.string()).min(1),
  }))),
  'coding-interviews': defineCollection(content('./content/coding-interviews', z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().int().min(1),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedMinutes: z.number().int().min(15).max(180),
    categories: z.array(z.string()).min(1),
    languages: z.array(codingInterviewLanguage).min(1),
    skills: z.array(z.string()).min(1),
    labPath: codingInterviewLabPath,
    status: codingInterviewStatus,
    tags: z.array(z.string()).default([]),
  }))),
};
