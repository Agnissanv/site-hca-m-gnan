// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://horizoncomptable.com',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // La page Témoignages reste hors du plan du site tant qu'elle est vide.
      filter: (page) => !page.includes('/temoignages'),
    }),
  ],
});
