import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const contentDirectory = fileURLToPath(new URL('../../content/coding-interviews/', import.meta.url));

const expectedSlugs = [
  'hashmaps-sliding-window',
  'lru-ttl-cache',
  'token-bucket-rate-limiter',
  'bounded-producer-consumer',
  'retry-timeout-jitter',
  'idempotent-order-api',
  'outbox-event-workflow',
  'microservice-observability-failure-lab',
];

const requiredHeadings = [
  'Interview prompt',
  'What you will build',
  'Requirements and constraints',
  'Suggested API or interface',
  'Starter-to-solution checkpoints',
  'Java and/or Python implementation notes',
  'Test cases and edge cases',
  'Complexity and resource analysis',
  'Concurrency and failure behavior',
  'Production extension questions',
  'Interview explanation checklist',
  'References',
];

type GuideFrontmatter = {
  title: unknown;
  summary: unknown;
  order: unknown;
  difficulty: unknown;
  estimatedMinutes: unknown;
  categories: unknown;
  languages: unknown;
  skills: unknown;
  labPath: unknown;
  status: unknown;
};

async function markdownFiles(): Promise<string[]> {
  return readdir(contentDirectory)
    .catch(() => [] as string[])
    .then((files) => files
      .filter((file) => file.endsWith('.md'))
      .sort((left, right) => expectedSlugs.indexOf(left.replace(/\.md$/, '')) - expectedSlugs.indexOf(right.replace(/\.md$/, ''))));
}

function splitMarkdown(source: string): { data: GuideFrontmatter; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return { data: YAML.parse(match[1]) as GuideFrontmatter, body: match[2] };
}

function expectNonEmptyStrings(value: unknown, field: string, file: string) {
  expect(value, `${file} needs a non-empty ${field}`).toEqual(expect.any(Array));
  expect((value as unknown[]).length, `${file} needs at least one ${field} value`).toBeGreaterThan(0);
  for (const item of value as unknown[]) {
    expect(item, `${file} has an invalid ${field} value`).toEqual(expect.any(String));
    expect((item as string).trim(), `${file} has a blank ${field} value`).not.toBe('');
  }
}

describe('coding interview guide contract', () => {
  it('publishes the complete, ordered eight-lab catalog with valid metadata', async () => {
    const files = await markdownFiles();
    expect(files.map((file) => file.replace(/\.md$/, ''))).toEqual(expectedSlugs);

    const entries = await Promise.all(files.map(async (file) => ({
      file,
      ...splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8')),
    })));
    const orders = entries.map(({ data }) => data.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(orders).size).toBe(orders.length);
    expect(new Set(files.map((file) => file.replace(/\.md$/, ''))).size).toBe(files.length);

    for (const { data, file } of entries) {
      expect(data.title, `${file} needs a title`).toEqual(expect.any(String));
      expect((data.title as string).trim(), `${file} needs a non-empty title`).not.toBe('');
      expect(data.summary, `${file} needs a summary`).toEqual(expect.any(String));
      expect((data.summary as string).trim(), `${file} needs a non-empty summary`).not.toBe('');
      expect(data.labPath, `${file} needs a labPath`).toEqual(expect.any(String));
      expect((data.labPath as string).trim(), `${file} needs a non-empty labPath`).not.toBe('');
      expect(data.difficulty, `${file} has an invalid difficulty`).toMatch(/^(beginner|intermediate|advanced)$/);
      expect(data.estimatedMinutes, `${file} needs an estimatedMinutes value`).toEqual(expect.any(Number));
      expect(Number.isInteger(data.estimatedMinutes), `${file} estimatedMinutes must be an integer`).toBe(true);
      expect(data.estimatedMinutes as number, `${file} estimatedMinutes must be at least 15`).toBeGreaterThanOrEqual(15);
      expect(data.estimatedMinutes as number, `${file} estimatedMinutes must be at most 180`).toBeLessThanOrEqual(180);
      expect(data.status, `${file} has an invalid status`).toMatch(/^(planned|ready|in_progress|completed)$/);
      expectNonEmptyStrings(data.categories, 'categories', file);
      expectNonEmptyStrings(data.languages, 'languages', file);
      expect(data.languages, `${file} must provide both Java and Python`).toEqual(expect.arrayContaining(['java', 'python']));
      expectNonEmptyStrings(data.skills, 'skills', file);
    }
  });

  it('keeps every guide interview-complete', async () => {
    const files = await markdownFiles();
    expect(files).toHaveLength(expectedSlugs.length);

    for (const file of files) {
      const { body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));
      for (const heading of requiredHeadings) {
        expect(body, `${file} is missing "${heading}"`).toMatch(new RegExp(`^## ${heading}$`, 'm'));
      }
    }
  });
});
