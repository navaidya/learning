import { describe, expect, it } from 'vitest';
import { withBase } from '../../src/lib/url';

describe('withBase', () => {
  it('prefixes the GitHub Pages sub-path base', () => {
    expect(withBase('/skills/foundations', '/learning')).toBe('/learning/skills/foundations');
  });

  it('does not double the slash when the base has a trailing slash', () => {
    expect(withBase('/skills/foundations', '/learning/')).toBe('/learning/skills/foundations');
  });

  it('leaves paths unchanged when served from the domain root', () => {
    expect(withBase('/skills/foundations', '/')).toBe('/skills/foundations');
  });

  it('normalizes an href that is missing its leading slash', () => {
    expect(withBase('skills', '/learning')).toBe('/learning/skills');
  });

  it('returns root rather than an empty string for the home link at root base', () => {
    expect(withBase('/', '/')).toBe('/');
  });
});
