import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const layoutPath = `${root}src/layouts/BaseLayout.astro`;
const catalogPath = `${root}src/pages/coding-interviews/index.astro`;
const detailPath = `${root}src/pages/coding-interviews/[slug].astro`;

async function exists(path: string): Promise<boolean> {
  return access(path, constants.F_OK).then(() => true).catch(() => false);
}

describe('coding interview routes contract', () => {
  it('places Coding Interviews after System Design and before Knowledge Book', async () => {
    const layout = await readFile(layoutPath, 'utf8');
    const systemDesign = layout.indexOf("['/system-design','System Design']");
    const codingInterviews = layout.indexOf("['/coding-interviews','Coding Interviews']");
    const knowledgeBook = layout.indexOf("['/book','Knowledge Book']");

    expect(codingInterviews).toBeGreaterThan(systemDesign);
    expect(codingInterviews).toBeLessThan(knowledgeBook);
  });

  it('provides a base-path-safe catalog route', async () => {
    expect(await exists(catalogPath)).toBe(true);
    const source = await readFile(catalogPath, 'utf8');
    expect(source).toContain('withBase');
    expect(source).toContain('/coding-interviews');
  });

  it('provides a base-path-safe detail route', async () => {
    expect(await exists(detailPath)).toBe(true);
    const source = await readFile(detailPath, 'utf8');
    expect(source).toContain('withBase');
    expect(source).toContain('/coding-interviews');
  });
});
