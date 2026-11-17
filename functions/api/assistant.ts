/**
 * POST /api/assistant : assistant d'intelligence artificielle générative du site (Cloudflare Pages Function).
 *
 * Contrat (art. 7) : l'IA fonctionne dans la limite de l'offre gratuite de Gemini. En cas de quota
 * atteint (429), d'erreur ou de clé absente, la fonction répond par une erreur et le navigateur
 * bascule automatiquement sur l'assistant programmé (public/assistant/kb.json).
 *
 * Variables d'environnement (tableau de bord Cloudflare Pages, ou .dev.vars en local) :
 *   GEMINI_API_KEY  clé Google AI Studio, SANS facturation activée (obligatoire)
 *   GEMINI_MODEL    modèle à utiliser (facultatif, défaut ci-dessous)
 * Liaison facultative :
 *   QUOTA           espace KV pour limiter le nombre de questions par visiteur et par heure
 */

interface EspaceKV {
  get(cle: string): Promise<string | null>;
  put(cle: string, valeur: string, options?: { expirationTtl?: number }): Promise<void>;
}
interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  QUOTA?: EspaceKV;
  ASSETS: { fetch: (requete: Request | string) => Promise<Response> };
}
interface Contexte { request: Request; env: Env }
interface EntreeBase { sujet: string; reponse: string }
interface Base { entrees: EntreeBase[] }

const MODELE_PAR_DEFAUT = "gemini-2.5-flash-lite";
const QUESTIONS_PAR_HEURE = 20;     // par visiteur, pour préserver le quota gratuit
const LONGUEUR_QUESTION = 400;
const TOURS_HISTORIQUE = 6;

const json = (donnees: unknown, statut = 200) =>
  new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const basesEnCache: Record<string, Base> = {};
async function chargerBase(env: Env, requete: Request, langue: "fr" | "en"): Promise<Base> {
  if (basesEnCache[langue]) return basesEnCache[langue];
  const fichier = langue === "en" ? "/assistant/kb-en.json" : "/assistant/kb.json";
  try {
    const r = await env.ASSETS.fetch(new URL(fichier, requete.url).toString());
    basesEnCache[langue] = (await r.json()) as Base;
  } catch {
    return { entrees: [] };
  }
  return basesEnCache[langue];
}

function consignes(base: Base): string {
  const connaissances = base.entrees.map((e) => `- ${e.sujet} : ${e.reponse}`).join("\n");
  return `Tu es l'assistant virtuel du site du Cabinet Horizon Comptable Afrique (HCA SARL), cabinet d'assistance comptable, fiscale, sociale et financière basé à Abidjan, en Côte d'Ivoire. Tu réponds aux visiteurs du site : PME, entrepreneurs et particuliers.

Règles à respecter strictement :
1. Réponds dans la langue du visiteur (le français par défaut, l'anglais si le visiteur écrit en anglais), en 120 mots au maximum, en texte simple, sans mise en forme Markdown (pas d'astérisques, pas de titres).
2. Tes réponses sont informatives et générales. Ne donne jamais de conseil personnalisé, de calcul d'impôt, de taux, de montant, de seuil, de date limite ni de référence de texte de loi, sauf s'ils figurent dans les informations ci-dessous. En cas de doute, dis simplement que le cabinet pourra préciser.
3. Pour toute situation particulière, invite le visiteur à prendre rendez-vous depuis la page Contact du site ou à écrire au cabinet sur WhatsApp.
4. Ne demande jamais d'informations confidentielles (chiffres de l'entreprise, identifiants, documents). Si le visiteur en donne, ne les répète pas.
5. Reste sur les sujets du cabinet : comptabilité, fiscalité, obligations sociales et paie, CNPS, DGI, facture normalisée électronique (FNE), création d'entreprise, gestion et financement, services et prise de contact. Pour une question sans rapport, réponds poliment que tu ne peux aider que sur ces sujets.
6. N'invente rien sur le cabinet : ni tarifs, ni noms, ni clients, ni ancienneté, ni adresse. Les honoraires sont fixés sur proposition, après un échange.
7. Présente-toi uniquement comme l'assistant du cabinet ; ne mentionne pas le modèle d'intelligence artificielle utilisé.

Informations validées par le cabinet :
${connaissances}
- Contact : page Contact du site (formulaire de question ou de demande de rendez-vous), WhatsApp, e-mail contact@horizoncomptable.com. Le cabinet est basé à Abidjan et accompagne des entreprises dans toute la Côte d'Ivoire, en rendez-vous ou à distance.`;
}

type Tour = { role: "user" | "model"; parts: { text: string }[] };

/** Historique du navigateur → format Gemini : commence par le visiteur, rôles alternés. */
function convertirHistorique(brut: unknown): Tour[] {
  if (!Array.isArray(brut)) return [];
  const tours: Tour[] = [];
  for (const h of brut.slice(-TOURS_HISTORIQUE)) {
    const texte = typeof h?.texte === "string" ? h.texte.trim().slice(0, 600) : "";
    if (!texte || texte === "…") continue;
    const role = h?.role === "visiteur" ? "user" : "model";
    if (tours.length === 0 && role === "model") continue;
    const dernier = tours[tours.length - 1];
    if (dernier && dernier.role === role) dernier.parts[0].text += `\n${texte}`;
    else tours.push({ role, parts: [{ text: texte }] });
  }
  return tours;
}

/** Nettoie un éventuel Markdown : le site affiche la réponse en texte brut. */
const texteSimple = (t: string) =>
  t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").replace(/^\s*[*-]\s+/gm, "• ").trim();

async function depasseQuota(env: Env, requete: Request): Promise<boolean> {
  if (!env.QUOTA) return false;
  const ip = requete.headers.get("CF-Connecting-IP") ?? "inconnu";
  const cle = `ia:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const compte = Number((await env.QUOTA.get(cle)) ?? 0);
  if (compte >= QUESTIONS_PAR_HEURE) return true;
  await env.QUOTA.put(cle, String(compte + 1), { expirationTtl: 3600 });
  return false;
}

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  if (!env.GEMINI_API_KEY) return json({ erreur: "assistant non configuré" }, 503);

  let corps: { question?: unknown; historique?: unknown; langue?: unknown };
  try {
    corps = await request.json();
  } catch {
    return json({ erreur: "requête invalide" }, 400);
  }
  const question = String(corps?.question ?? "").trim().slice(0, LONGUEUR_QUESTION);
  const langue = corps?.langue === "en" ? "en" : "fr";
  if (!question) return json({ erreur: "question vide" }, 400);

  if (await depasseQuota(env, request)) return json({ erreur: "limite de questions atteinte" }, 429);

  const historique = convertirHistorique(corps?.historique);
  // La question courante est déjà le dernier élément de l'historique envoyé par le navigateur.
  const dernier = historique[historique.length - 1];
  if (!dernier || dernier.role !== "user" || !dernier.parts[0].text.endsWith(question)) {
    historique.push({ role: "user", parts: [{ text: question }] });
  }

  const modele = env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
  let reponse: Response;
  try {
    reponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: consignes(await chargerBase(env, request, langue)) }] },
        contents: historique,
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    });
  } catch {
    return json({ erreur: "service injoignable" }, 502);
  }

  if (reponse.status === 429) return json({ erreur: "quota gratuit atteint" }, 429);
  if (!reponse.ok) return json({ erreur: "service indisponible" }, 502);

  const donnees = (await reponse.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const texte = texteSimple((donnees.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join(""));
  if (!texte) return json({ erreur: "réponse vide" }, 502);

  return json({ reponse: texte.slice(0, 1500) });
};
