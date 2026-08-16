import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const layoutPath = `${root}src/layouts/BaseLayout.astro`;
const catalogPath = `${root}src/pages/coding-interviews/index.astro`;
const detailPath = `${root}src/pages/coding-interviews/[slug].astro`;
const cardPath = `${root}src/components/coding-interviews/CodingInterviewCard.astro`;
const stylesPath = `${root}src/styles/coding-interviews.css`;

async function exists(path: string): Promise<boolean> {
  return access(path, constants.F_OK).then(() => true).catch(() => false);
}

function ruleBody(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  expect(match, `Missing CSS rule for ${selector}`).not.toBeNull();
  return match![1];
}

function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => Number.parseInt(channel, 16) / 255);
    const [red, green, blue] = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
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
    expect(source).toContain("getCollection('coding-interviews')");
    expect(source).toMatch(/\.sort\(\(left, right\) => left\.data\.order - right\.data\.order\)/);
    expect(source).toContain('entries.map((entry) =>');
    expect(source).toContain('href={withBase(`/coding-interviews/${entry.id}`)}');
    expect(source).not.toMatch(/entries\[\d+\]/);
    expect(source).not.toMatch(/grid-template-rows/);
    expect(source).not.toMatch(/href=(?:["']|\{["'])\//);
  });

  it('provides a complete, base-path-safe detail route with guarded adjacent links', async () => {
    expect(await exists(detailPath)).toBe(true);
    const source = await readFile(detailPath, 'utf8');
    expect(source).toContain("getCollection('coding-interviews')");
    expect(source).toMatch(/\.sort\(\(left, right\) => left\.data\.order - right\.data\.order\)/);
    expect(source).toContain("withBase('/coding-interviews')");
    expect(source).toContain('withBase(`/coding-interviews/${previous.id}`)');
    expect(source).toContain('withBase(`/coding-interviews/${next.id}`)');
    expect(source).toContain('{previous &&');
    expect(source).toContain('{next &&');
    expect(source).toContain('const labHref = `https://github.com/${repository}/tree/main/${entry.data.labPath}`');
    expect(source).toContain('href={labHref}');

    for (const metadataField of ['title', 'summary', 'difficulty', 'estimatedMinutes', 'languages', 'status', 'categories', 'skills', 'tags', 'labPath']) {
      expect(source, `detail route should expose ${metadataField}`).toContain(`entry.data.${metadataField}`);
    }

    expect(source).not.toMatch(/href=(?:["']|\{["'])\//);
  });

  it('keeps catalog cards driven by collection data rather than a fixed lab list', async () => {
    expect(await exists(cardPath)).toBe(true);
    const source = await readFile(cardPath, 'utf8');
    expect(source).toContain("CollectionEntry<'coding-interviews'>");
    expect(source).toContain('href={href}');
    expect(source).not.toMatch(/hashmaps|cache|bucket|producer|retry|idempotent|outbox|observability/i);
  });

  it('keeps responsive cards keyboard-accessible without fixed-width overflow', async () => {
    expect(await exists(stylesPath)).toBe(true);
    const styles = await readFile(stylesPath, 'utf8');
    expect(styles).toContain('minmax(min(100%, 300px), 1fr)');
    expect(styles).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(styles).toMatch(/\.coding-interviews-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    expect(styles).toContain('.coding-interview-card:focus-visible');
    expect(styles).toContain('.coding-interview-detail a:focus-visible');
    expect(styles).toMatch(/\.coding-interview-detail a:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--accent\)/s);
    expect(styles).toContain('min-width: 0');
    expect(styles).toContain('overflow-x: auto');
    expect(styles).not.toMatch(/(?:^|[;{])\s*width\s*:\s*\d+px\b/m);

    const badge = ruleBody(styles, '.coding-interview-badge');
    const background = badge.match(/background:\s*(#[a-f\d]{6})/i)?.[1];
    const foreground = badge.match(/color:\s*(#[a-f\d]{6})/i)?.[1];
    expect(background, 'badge needs a solid background color').toBeDefined();
    expect(foreground, 'badge needs a readable foreground color').toBeDefined();
    expect(contrastRatio(background!, foreground!)).toBeGreaterThanOrEqual(4.5);
  });
});
