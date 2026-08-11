/**
 * Builds an internal href that respects Astro's configured `base`.
 *
 * GitHub Pages serves this site from `/<repo>`, so a bare `/skills/kubernetes`
 * resolves to the domain root and 404s. Every internal link must go through
 * this helper; only external URLs should be written literally.
 */
export function withBase(href: string, base: string = import.meta.env.BASE_URL): string {
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedHref = href.startsWith('/') ? href : `/${href}`;
  return `${normalizedBase}${normalizedHref}` || '/';
}
