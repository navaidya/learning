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

    const [dashboard, bookIndex, kubernetesHub] = await Promise.all([
      output('index.html'),
      output('book/index.html'),
      output('book/topics/kubernetes/index.html'),
    ]);

    expect(dashboard).toContain('Start Here');
    expect(dashboard).toContain('Explore by topic');
    expect(dashboard).toContain('Recently added');
    expect(dashboard).not.toContain('Learning debt');
    expect(bookIndex).toContain('All notes');
    expect(kubernetesHub).toContain('Kubernetes Architecture');
    expect(kubernetesHub).toContain('AI-assisted Kubernetes Troubleshooting');
  }, 30_000);
});
