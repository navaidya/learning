import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const contentDirectory = fileURLToPath(new URL('../../content/security/', import.meta.url));

const expectedSlugs = [
  '00-security-learning-roadmap',
  '01-security-foundations-and-threat-modeling',
  '02-cryptography-essentials',
  '03-pki-tls-and-certificates',
  '04-identity-and-authentication',
  '05-oauth2-and-oidc-deep-dive',
  '06-authorization-and-access-control',
  '07-application-and-api-security',
  '08-supply-chain-security',
  '09-container-and-kubernetes-security',
  '10-cloud-security-on-oci',
  '11-network-security-and-zero-trust',
  '12-logging-detection-and-tamper-evident-audit',
  '13-ai-agent-security',
  '14-securing-external-system-integrations',
  '15-incident-response-and-secure-operations',
];

const categories = ['Roadmap', 'Foundations', 'Identity & Access', 'Application & Platform', 'Detection & Response', 'AI & Agent Security'];

// Every learning module (order >= 1) follows the same teaching shape.
const requiredHeadings = [
  'Why this matters for our system',
  'Core concepts',
  'How it works',
  'How it is attacked',
  'Defensive checklist',
  'Simple example',
  'Apply it to our platform',
  'Practice',
  'Courses and resources',
  'Key takeaways',
];

async function markdownFiles() {
  return readdir(contentDirectory)
    .catch(() => [] as string[])
    .then((files) => files.filter((file) => file.endsWith('.md')).sort());
}

function splitMarkdown(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return { data: YAML.parse(match[1]), body: match[2] };
}

describe('security content contract', () => {
  it('publishes the complete, ordered curriculum', async () => {
    const files = await markdownFiles();
    expect(files.map((file) => file.replace(/\.md$/, ''))).toEqual(expectedSlugs);

    const entries = await Promise.all(
      files.map(async (file) => splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'))),
    );
    expect(entries.map(({ data }) => data.order)).toEqual(expectedSlugs.map((_, index) => index));

    for (const { data } of entries) {
      expect(data).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          summary: expect.any(String),
          difficulty: expect.stringMatching(/^(foundational|intermediate|advanced)$/),
          readingMinutes: expect.any(Number),
          threatsCovered: expect.any(Array),
          practices: expect.any(Array),
          tags: expect.any(Array),
        }),
      );
      expect(categories).toContain(data.category);
      expect(data.readingMinutes).toBeGreaterThanOrEqual(5);
      expect(data.readingMinutes).toBeLessThanOrEqual(90);
    }
  });

  it('keeps every module teaching-complete and diagram-driven', async () => {
    const files = await markdownFiles();
    for (const file of files) {
      const { data, body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));

      if (data.order >= 1) {
        for (const heading of requiredHeadings) {
          expect(body, `${file} is missing "${heading}"`).toMatch(new RegExp(`^## \\d+\\. ${heading}`, 'm'));
        }
      }

      const diagrams = [...body.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1]);
      expect(diagrams.length, `${file} needs at least one diagram`).toBeGreaterThanOrEqual(1);
      for (const diagram of diagrams) {
        expect(diagram, `${file} has a diagram without an accessible title`).toMatch(/^\s*\w+[^\n]*\n\s+accTitle: .+/m);
        expect(diagram, `${file} has a diagram without an accessible description`).toMatch(/^\s*accDescr: .+/m);
      }
    }
  });

  it('only cites https links in the module bodies', async () => {
    const files = await markdownFiles();
    for (const file of files) {
      const { body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));
      const urls = [...body.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]);
      for (const url of urls) {
        expect(url, `${file} cites a non-https url: ${url}`).toMatch(/^https:\/\//);
      }
    }
  });
});
