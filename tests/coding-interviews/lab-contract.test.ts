import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contentDirectory = `${root}content/coding-interviews/`;
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

type LabGuide = { labPath: string; languages: string[] };

async function markdownFiles(): Promise<string[]> {
  return readdir(contentDirectory)
    .catch(() => [] as string[])
    .then((files) => files
      .filter((file) => file.endsWith('.md'))
      .sort((left, right) => expectedSlugs.indexOf(left.replace(/\.md$/, '')) - expectedSlugs.indexOf(right.replace(/\.md$/, ''))));
}

async function guideFor(file: string): Promise<LabGuide> {
  const source = await readFile(`${contentDirectory}${file}`, 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file} is missing YAML frontmatter`);
  return YAML.parse(match[1]) as LabGuide;
}

async function filesRecursively(directory: string): Promise<string[]> {
  return readdir(directory, { recursive: true })
    .catch(() => [] as string[])
    .then((entries) => entries.filter((entry) => typeof entry === 'string'));
}

describe('coding interview runnable lab contract', () => {
  it('provides a runnable lab directory for every published guide', async () => {
    const files = await markdownFiles();
    expect(files.map((file) => file.replace(/\.md$/, ''))).toEqual(expectedSlugs);
    const guides = await Promise.all(files.map(guideFor));

    for (const guide of guides) {
      expect(guide.labPath).toMatch(/^coding-labs\/[a-z0-9-]+$/);
      const labDirectory = `${root}${guide.labPath}/`;
      const labFiles = await filesRecursively(labDirectory);
      expect(labFiles).toContain('README.md');

      for (const language of guide.languages) {
        expect(language).toMatch(/^(java|python)$/);
        const languageDirectory = `${labDirectory}${language}/`;
        const languageFiles = await filesRecursively(languageDirectory);
        expect(languageFiles).toContain('README.md');

        const sourceExtension = language === 'java' ? /\.java$/ : /\.py$/;
        expect(languageFiles.filter((file) => sourceExtension.test(file) && !/(^|\/)test(s)?\//.test(file))).not.toHaveLength(0);
        expect(languageFiles.filter((file) => sourceExtension.test(file) && /(^|\/)test(s)?\//.test(file))).not.toHaveLength(0);

        const readme = await readFile(`${languageDirectory}README.md`, 'utf8');
        expect(readme, `${guide.labPath}/${language} needs a concrete test command`).toMatch(/python(?:3)? -m unittest|\bjavac\b|\bjava\b/);
        expect(readme, `${guide.labPath}/${language} needs a cleanup note`).toMatch(/cleanup/i);
      }
    }
  });
});
