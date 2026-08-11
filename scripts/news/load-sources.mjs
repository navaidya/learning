import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { parseNewsSources } from '../../src/lib/news/validate.ts';

/**
 * @param {string | URL} filePath
 * @returns {Promise<import('../../src/lib/news/types.ts').NewsSource[]>}
 */
export async function loadSources(filePath) {
  const text = await readFile(filePath, 'utf8');
  const parsed = parse(text);
  return parseNewsSources(parsed ?? []);
}
