import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  site: 'https://navaidya.github.io',
  base: repository ? `/${repository}` : '/',
  integrations: [mdx(), sitemap()],
});
