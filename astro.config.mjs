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
      // Les pages Témoignages restent hors du plan du site tant qu'elles sont vides.
      filter: (page) => !page.includes('/temoignages') && !page.includes('/testimonials'),
      // Version française à la racine, anglaise sous /en/ : liens hreflang dans le plan du site.
      i18n: { defaultLocale: 'fr', locales: { fr: 'fr', en: 'en' } },
    }),
  ],
});
