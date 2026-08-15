import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const contentDirectory = fileURLToPath(new URL('../../content/system-design/', import.meta.url));

const expectedSlugs = [
  '01-ai-native-mobility-marketplace',
  '02-ai-native-url-shortener',
  '03-ai-native-cloud-knowledge-workspace',
  '04-ai-native-private-messaging',
  '05-ai-native-public-conversation-network',
  '06-ai-native-social-network',
  '07-ai-native-delivery-marketplace',
];

const requiredHeadings = [
  'Interview prompt',
  'Requirements and scope',
  'Capacity estimate',
  'API and event contracts',
  'System context',
  'Container architecture',
  'Component deep dive',
  'Critical flow',
  'Data model',
  'Storage, partitioning, consistency, and caching',
  'Reliability and failure handling',
  'Security, privacy, moderation, and abuse prevention',
  'AI architecture',
  'Model lifecycle, evaluation, and observability',
  'Cost controls and deterministic fallbacks',
  'Trade-offs and alternatives',
  'Phased evolution',
  '45-minute interview walkthrough',
  'Follow-up questions and key takeaways',
  'References',
];

async function markdownFiles() {
  return readdir(contentDirectory).catch(() => [] as string[]).then((files) => files.filter((file) => file.endsWith('.md')).sort());
}

function splitMarkdown(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return { data: YAML.parse(match[1]), body: match[2] };
}

describe('system design content contract', () => {
  it('publishes the complete, ordered seven-case catalog', async () => {
    const files = await markdownFiles();
    expect(files.map((file) => file.replace(/\.md$/, ''))).toEqual(expectedSlugs);

    const entries = await Promise.all(files.map(async (file) => splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'))));
    expect(entries.map(({ data }) => data.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    for (const { data } of entries) {
      expect(data).toEqual(expect.objectContaining({
        title: expect.any(String),
        summary: expect.any(String),
        difficulty: expect.stringMatching(/^(intermediate|advanced)$/),
        interviewMinutes: expect.any(Number),
        scaleChallenge: expect.any(String),
        aiFocus: expect.any(Array),
        tags: expect.any(Array),
      }));
      expect(data.interviewMinutes).toBeGreaterThanOrEqual(30);
      expect(data.interviewMinutes).toBeLessThanOrEqual(60);
      expect(data.aiFocus.length).toBeGreaterThan(0);
    }
  });

  it('keeps every case interview-complete and diagram-driven', async () => {
    const files = await markdownFiles();
    expect(files).toHaveLength(7);
    for (const file of files) {
      const { body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));
      for (const heading of requiredHeadings) {
        expect(body, `${file} is missing "${heading}"`).toMatch(new RegExp(`^## \\d+\\. ${heading}`, 'm'));
      }
      const diagrams = [...body.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1]);
      expect(diagrams.length, `${file} needs at least five diagrams`).toBeGreaterThanOrEqual(5);
      for (const diagram of diagrams) {
        expect(diagram, `${file} has a diagram without an accessible title`).toMatch(/^\s*\w+[^\n]*\n\s+accTitle: .+/m);
        expect(diagram, `${file} has a diagram without an accessible description`).toMatch(/^\s*accDescr: .+/m);
      }
    }
  });
});
