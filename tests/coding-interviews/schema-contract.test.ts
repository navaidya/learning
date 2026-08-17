import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const configPath = fileURLToPath(new URL('../../src/content.config.ts', import.meta.url));

describe('coding interview collection schema', () => {
  it('constrains language values to Java and Python', async () => {
    const source = await readFile(configPath, 'utf8');
    expect(source).toContain("const codingInterviewLanguage = z.enum(['java', 'python']);");
    expect(source).toContain('languages: z.array(codingInterviewLanguage).min(1)');
  });

  it('constrains the lab path to one safe directory below coding-labs', async () => {
    const source = await readFile(configPath, 'utf8');
    expect(source).toContain("const codingInterviewLabPath = z.string().regex(/^coding-labs\\/[a-z0-9]+(?:-[a-z0-9]+)*$/");
    expect(source).toContain('labPath: codingInterviewLabPath');
  });
});
