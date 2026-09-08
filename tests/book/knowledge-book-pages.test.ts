import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const output = (path: string) => readFile(new URL(`../../dist/${path}`, import.meta.url), 'utf8');

describe('Knowledge Book pages', () => {
  it('renders a knowledge-first dashboard and a Kubernetes topic hub', async () => {
    await execFileAsync('npm', ['run', 'build'], { cwd: repoRoot });

    const [dashboard, bookIndex, kubernetesHub, aiWatch, retiredSkills] = await Promise.all([
      output('index.html'),
      output('book/index.html'),
      output('book/topics/kubernetes/index.html'),
      output('ai-watch/index.html'),
      output('skills/index.html'),
    ]);

    expect(dashboard).toContain('Start Here');
    expect(dashboard).toContain('Explore by topic');
    expect(dashboard).toContain('Recently added');
    expect(dashboard).not.toContain('Learning debt');
    expect(bookIndex).toContain('All notes');
    expect(kubernetesHub).toContain('Kubernetes Architecture');
    expect(kubernetesHub).toContain('AI-assisted Kubernetes Troubleshooting');
    expect(dashboard).toContain('AI Watch');
    expect(dashboard).not.toContain('Skill Map');
    expect(aiWatch).toContain('Source health');
    expect(aiWatch).toContain('latest podcasts');
    expect(aiWatch).toContain('latest YouTube talks');
    expect(aiWatch).toContain('27-agent-engineering-field-guide');
    expect(aiWatch).not.toContain('Skill Map');
    expect(retiredSkills).toContain('http-equiv="refresh"');
    expect(retiredSkills).toContain('ai-watch');
  }, 30_000);
});
