import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const pilotSlug = '01-ai-native-mobility-marketplace';
const deploymentFile = fileURLToPath(new URL('../../content/system-design-deployments/01-ai-native-mobility-marketplace.md', import.meta.url));
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

describe('mobility deployment content contract', () => {
  it('publishes typed metadata and the complete deployment analysis', async () => {
    const { data, body } = splitMarkdown(await readFile(deploymentFile, 'utf8'));

    expect(data).toEqual({
      title: expect.any(String),
      summary: expect.any(String),
      systemDesign: pilotSlug,
      order: 2,
      deploymentStyle: expect.any(String),
      availabilityTarget: expect.any(String),
      regions: 'multi-region',
      tags: expect.arrayContaining(['kubernetes', 'regional-cells']),
    });

    for (const heading of deploymentHeadings) {
      expect(body, 'missing deployment section: ' + heading).toMatch(new RegExp('^## \\d+\\. ' + heading + '$', 'm'));
    }

    const diagrams = [...body.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1]);
    expect(diagrams.length).toBeGreaterThanOrEqual(2);
    for (const diagram of diagrams) {
      expect(diagram).toMatch(/^\s*\w+[^\n]*\n\s+accTitle: .+/m);
      expect(diagram).toMatch(/^\s*accDescr: .+/m);
      if (/^\s*sequenceDiagram/m.test(diagram)) {
        expect(diagram, 'Mermaid treats semicolons in sequence messages as statement separators').not.toMatch(/(?:->>|-->>)[^\n]*;/);
      }
    }

    expect(body).toContain('| Component | Runtime and placement | Scaling unit | Stateful | Failure behavior |');
    expect(body).toMatch(/\bRPO\b/);
    expect(body).toMatch(/\bRTO\b/);
    expect((body.match(/^\| Failure:/gm) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(body).toMatch(/deterministic[\s\S]{0,120}fallback/i);
    expect(body, 'internal Markdown links bypass withBase() and can break under the GitHub Pages base path').not.toMatch(/\]\((?:\/|\.\.\/)[^)]+\)/);
  });
});
