import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const designDirectory = fileURLToPath(new URL('../../content/system-design/', import.meta.url));
const deploymentDirectory = fileURLToPath(new URL('../../content/system-design-deployments/', import.meta.url));
const deploymentHeadings = [
  'Deployment goals and assumptions',
  'Traffic classes and critical paths',
  'Deployment architecture',
  'Edge, ingress, and API tier',
  'Kubernetes and compute layout',
  'Stateful data and messaging',
  'Network zones and security boundaries',
  'Availability and failure-domain placement',
  'Scaling and capacity mapping',
  'Configuration, secrets, and service discovery',
  'Observability and operations',
  'Release, rollback, and data migration',
  'Disaster recovery and multi-region evolution',
  'Failure scenarios and graceful degradation',
  'Cost and architecture trade-offs',
  'Interview walkthrough',
  'Cloud capability mapping',
];

function splitMarkdown(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return { data: YAML.parse(match[1]), body: match[2] };
}

async function markdownFiles(directory: string) {
  return (await readdir(directory).catch(() => [] as string[])).filter((file) => file.endsWith('.md')).sort();
}

describe('system design deployment content contract', () => {
  it('maps exactly one deployment architecture to every parent in catalog order', async () => {
    const designFiles = await markdownFiles(designDirectory);
    const deploymentFiles = await markdownFiles(deploymentDirectory);
    expect(deploymentFiles).toEqual(designFiles);

    const systemDesignValues: string[] = [];
    for (const [index, file] of deploymentFiles.entries()) {
      const slug = file.replace(/\.md$/, '');
      const { data, body } = splitMarkdown(await readFile(`${deploymentDirectory}/${file}`, 'utf8'));
      systemDesignValues.push(data.systemDesign);

      expect(data).toEqual(expect.objectContaining({
        title: expect.any(String),
        summary: expect.any(String),
        systemDesign: slug,
        order: index + 1,
        deploymentStyle: expect.any(String),
        availabilityTarget: expect.any(String),
        regions: expect.stringMatching(/^(single-region|multi-region|global)$/),
        tags: expect.any(Array),
      }));
      expect(data.tags.length, `${file} needs deployment tags`).toBeGreaterThan(0);

      for (const heading of deploymentHeadings) {
        expect(body, `${file} is missing deployment section: ${heading}`).toMatch(new RegExp(`^## \\d+\\. ${heading}$`, 'm'));
      }

      const diagrams = [...body.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1]);
      expect(diagrams.length, `${file} needs a deployment and request/data-path diagram`).toBeGreaterThanOrEqual(2);
      for (const diagram of diagrams) {
        expect(diagram, `${file} has a diagram without an accessible title`).toMatch(/^\s*\w+[^\n]*\n\s+accTitle: .+/m);
        expect(diagram, `${file} has a diagram without an accessible description`).toMatch(/^\s*accDescr: .+/m);
        if (/^\s*sequenceDiagram/m.test(diagram)) {
          expect(diagram, 'Mermaid treats semicolons in sequence messages as statement separators').not.toMatch(/(?:->>|-->>)[^\n]*;/);
        }
      }

      expect(body).toContain('| Component | Runtime and placement | Scaling unit | Stateful | Failure behavior |');
      expect(body, `${file} needs an explicit recovery-point discussion`).toMatch(/\bRPO\b/);
      expect(body, `${file} needs an explicit recovery-time discussion`).toMatch(/\bRTO\b/);
      expect((body.match(/^\| Failure:/gm) ?? []).length, `${file} needs at least three failure rows`).toBeGreaterThanOrEqual(3);
      expect(body, `${file} needs a deterministic AI fallback`).toMatch(/deterministic[\s\S]{0,160}fallback/i);
      expect(body, `${file} contains an unsafe internal Markdown link`).not.toMatch(/\]\((?:\/|\.\.\/)[^)]+\)/);
    }

    expect(new Set(systemDesignValues).size).toBe(systemDesignValues.length);
  });
});
