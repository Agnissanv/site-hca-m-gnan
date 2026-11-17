// Version bilingue du site : français à la racine, anglais sous /en/.
// Chaque page existe une seule fois (src/vues) avec ses textes dans les deux langues ;
// ce fichier contient les adresses et les textes des éléments communs.
import { lien } from "./config";

export type Langue = "fr" | "en";
export type Page = "accueil" | "cabinet" | "services" | "contact" | "legal" | "temoignages";

export const langues: Langue[] = ["fr", "en"];

/** Adresse de chaque page dans chaque langue (sans le préfixe de base). */
export const routes: Record<Page, Record<Langue, string>> = {
  accueil: { fr: "/", en: "/en/" },
  cabinet: { fr: "/a-propos", en: "/en/about" },
  services: { fr: "/services", en: "/en/services" },
  contact: { fr: "/contact", en: "/en/contact" },
  legal: { fr: "/mentions-legales", en: "/en/legal" },
  temoignages: { fr: "/temoignages", en: "/en/testimonials" },
};

/** Lien interne vers une page, dans une langue, avec une ancre éventuelle (ex. "#rendez-vous"). */
export const url = (page: Page, langue: Langue, ancre = "") => lien(routes[page][langue]) + ancre;

/** Pages du menu principal, dans l'ordre. */
export const menu: Page[] = ["accueil", "cabinet", "services", "contact"];

const nbsp = " ";

export const ui = {
  fr: {
    nav: { accueil: "Accueil", cabinet: "Le cabinet", services: "Services", contact: "Contact", legal: "Mentions légales", temoignages: "Témoignages" },
    rdv: "Prendre rendez-vous",
    allerContenu: "Aller au contenu",
    accueilAria: "Horizon Comptable Afrique, accueil",
    ouvrirMenu: "Ouvrir le menu",
    fermerMenu: "Fermer le menu",
    navAria: "Navigation principale",
    langueAria: "Langue du site",
    nousJoindre: "Nous joindre",
    leSite: "Le site",
    nousSuivre: "Nous suivre",
    signature: "Votre partenaire de confiance en comptabilité",
    resume: "Comptabilité, fiscalité, paie et conseil financier pour les PME et les entrepreneurs de Côte d'Ivoire.",
    titreAccueil: "Cabinet comptable à Abidjan",
    messageWhatsApp: "Bonjour, je souhaite échanger avec le cabinet Horizon Comptable Afrique.",
    assistant: {
      pastille: `Une question${nbsp}?`,
      whatsappAria: "Écrire au cabinet sur WhatsApp",
      titre: "Assistant Horizon",
      avis: "Réponses à titre informatif, sans valeur de conseil comptable, fiscal ou juridique. N'indiquez pas d'informations confidentielles.",
      fermer: "Fermer l'assistant",
      sujets: "Sujets fréquents",
      label: "Votre question",
      placeholder: "Écrivez votre question…",
      envoyer: "Envoyer",
      base: "/assistant/kb.json",
    },
  },
  en: {
    nav: { accueil: "Home", cabinet: "The firm", services: "Services", contact: "Contact", legal: "Legal notice", temoignages: "Testimonials" },
    rdv: "Book an appointment",
    allerContenu: "Skip to content",
    accueilAria: "Horizon Comptable Afrique, home",
    ouvrirMenu: "Open menu",
    fermerMenu: "Close menu",
    navAria: "Main navigation",
    langueAria: "Site language",
    nousJoindre: "Get in touch",
    leSite: "Site",
    nousSuivre: "Follow us",
    signature: "Your trusted accounting partner",
    resume: "Accounting, tax, payroll and financial advice for SMEs and entrepreneurs in Côte d'Ivoire.",
    titreAccueil: "Accounting firm in Abidjan",
    messageWhatsApp: "Hello, I would like to get in touch with Horizon Comptable Afrique.",
    assistant: {
      pastille: "Got a question?",
      whatsappAria: "Message the firm on WhatsApp",
      titre: "Horizon Assistant",
      avis: "Answers are for information only and are not accounting, tax or legal advice. Please do not share confidential information.",
      fermer: "Close the assistant",
      sujets: "Common topics",
      label: "Your question",
      placeholder: "Type your question…",
      envoyer: "Send",
      base: "/assistant/kb-en.json",
    },
  },
} as const;
