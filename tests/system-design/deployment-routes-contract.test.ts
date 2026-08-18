import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFile(fileURLToPath(new URL('../../' + relativePath, import.meta.url)), 'utf8').catch(() => '');

describe('system design deployment routes', () => {
  it('generates child pages from the deployment and parent collections', async () => {
    const route = await source('src/pages/system-design/[slug]/deployment.astro');

    expect(route).toContain("getCollection('system-design-deployments')");
    expect(route).toContain("getCollection('system-design')");
    expect(route).toContain('withBase');
    expect(route).toContain('DeploymentArchitectureLayout');
  });

  it('links parent and child pages through reusable layouts', async () => {
    const [parentRoute, parentLayout, deploymentLayout] = await Promise.all([
      source('src/pages/system-design/[slug].astro'),
      source('src/layouts/SystemDesignLayout.astro'),
      source('src/layouts/DeploymentArchitectureLayout.astro'),
    ]);

    expect(parentRoute).toContain('deploymentHref');
    expect(parentLayout).toContain('View deployment architecture');
    expect(deploymentLayout).toContain('Cloud-neutral deployment architecture');
    expect(deploymentLayout).toContain('parentHref');
    expect(deploymentLayout).toContain('slot name="sidebar"');
    expect(deploymentLayout).toContain('slot name="pagination"');
  });
});
