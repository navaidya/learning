import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const contentDirectory = fileURLToPath(new URL('../../content/system-design/', import.meta.url));

const expectedSlugs = [
  '00-system-design-template',
  '01-ai-native-mobility-marketplace',
  '02-ai-native-url-shortener',
  '03-ai-native-cloud-knowledge-workspace',
  '04-ai-native-private-messaging',
  '05-ai-native-public-conversation-network',
  '06-ai-native-social-network',
  '07-ai-native-delivery-marketplace',
  '08-rate-limiter',
  '09-distributed-cache',
  '10-distributed-message-queue',
  '11-observability-platform',
  '12-video-streaming-platform',
  '13-web-crawler',
  '14-search-autocomplete',
  '15-notification-system',
  '16-ecommerce-platform',
  '17-payments-ledger',
  '18-event-ticketing',
  '19-travel-booking',
  '20-collaborative-doc-editor',
  '21-multi-agent-orchestration',
  '22-ml-feature-store-serving',
  '23-llm-search-rag',
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
  it('publishes the complete, ordered catalog', async () => {
    const files = await markdownFiles();
    expect(files.map((file) => file.replace(/\.md$/, ''))).toEqual(expectedSlugs);

    const entries = await Promise.all(files.map(async (file) => splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'))));
    expect(entries.map(({ data }) => data.order)).toEqual(expectedSlugs.map((_, index) => index + 1));

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
    expect(files).toHaveLength(expectedSlugs.length);
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

  it('makes every design requirements and logical diagrams self-explaining', async () => {
    const files = await markdownFiles();
    for (const file of files) {
      const { body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));

      expect(body, `${file} needs functional requirements`).toContain('### Functional requirements');
      expect(body).toContain('| ID | Requirement | Priority | Interview significance |');
      expect(body, `${file} needs non-functional requirements`).toContain('### Non-functional requirements');
      expect(body).toContain('| Quality | Measurable target | Why it matters | Architecture consequence |');
      expect(body, `${file} needs explicit exclusions`).toMatch(/\*\*Scope exclusions:\*\*/);
      expect(body, `${file} needs explicit assumptions`).toMatch(/\*\*Assumptions:\*\*/);
      expect(body, `${file} needs context roles`).toContain('### Context component roles');
      expect(body, `${file} needs container roles`).toContain('### Container component roles');

      const context = body.match(/## 5\. System context[\s\S]*?```mermaid\n([\s\S]*?)```/)?.[1] ?? '';
      const container = body.match(/## 6\. Container architecture[\s\S]*?```mermaid\n([\s\S]*?)```/)?.[1] ?? '';
      for (const diagram of [context, container]) {
        expect(diagram, `${file} needs visible role phrases`).toContain('<br/>');
        expect(diagram).toMatch(/accTitle: .+/);
        expect(diagram).toMatch(/accDescr: .+/);
      }
    }
  });
});
