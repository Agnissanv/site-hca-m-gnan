// Informations du cabinet utilisées sur tout le site.
// Les valeurs marquées PROVISOIRE sont à remplacer avant la mise en ligne.

export const cabinet = {
  nom: "Horizon Comptable Afrique",
  raisonSociale: "Cabinet Horizon Comptable Afrique SARL",
  sigle: "HCA",
  ville: "Abidjan, Côte d'Ivoire",
  domaine: "https://horizoncomptable.com",
  email: "contact@horizoncomptable.com",
  // PROVISOIRE : ligne du cabinet figurant sur la DFE, en attendant le numéro WhatsApp choisi par M. Gnan.
  whatsapp: "2250708094521",
  telephone: "+225 07 08 09 45 21",
  numeroProvisoire: true,
  // PROVISOIRE : pages créées par Code A-Z au démarrage du projet.
  facebook: "#",
  linkedin: "#",
  legal: {
    forme: "Société à responsabilité limitée (SARL)",
    capital: "3 000 000 FCFA",
    rccm: "CI-DIV-01-2026-B12-00090",
    siege: "Quartier Jérusalem Forestier, BP 189 Divo, Côte d'Ivoire",
    directeurPublication: "M. GNAN Younegnre Joël, Gérant",
  },
};

// Le site peut être servi à la racine (horizoncomptable.com) ou dans un sous-dossier
// (aperçu GitHub Pages : /site-hca-m-gnan/). Tous les liens internes passent par lien().
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const lien = (chemin: string) => (/^(https?:|mailto:|tel:|#)/.test(chemin) ? chemin : `${BASE}${chemin}`);

export const lienWhatsApp = (message = "Bonjour, je souhaite échanger avec le cabinet Horizon Comptable Afrique.") =>
  `https://wa.me/${cabinet.whatsapp}?text=${encodeURIComponent(message)}`;

export const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "Le cabinet" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];
