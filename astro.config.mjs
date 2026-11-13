// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Production : https://horizoncomptable.com (racine).
// Aperçu de la maquette sur GitHub Pages : SITE_URL et BASE_PATH sont fournis par le workflow.
const site = process.env.SITE_URL || 'https://horizoncomptable.com';
const base = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // La page Témoignages reste hors du plan du site tant qu'elle est vide.
      filter: (page) => !page.includes('/temoignages'),
    }),
  ],
});
