import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aiconsent.au',
  output: 'static',
  integrations: [sitemap({ filter: (p) => !p.includes('/admin') && !p.includes('/claims/item') && !p.includes('/404') })],
  compressHTML: true,
  build: { format: 'directory' }
});
