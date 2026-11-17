/**
 * POST /api/contact : réception du formulaire de contact / demande de rendez-vous (Cloudflare Pages Function).
 * Vérifie l'anti-spam (Turnstile + champ piège), puis envoie la demande par e-mail au cabinet via Resend.
 *
 * Variables d'environnement (tableau de bord Cloudflare Pages, ou .dev.vars en local) :
 *   RESEND_API_KEY      clé Resend (domaine horizoncomptable.com vérifié)
 *   EMAIL_EXPEDITEUR    ex. "Site Horizon Comptable <site@horizoncomptable.com>"
 *   EMAIL_DESTINATAIRE  ex. "contact@horizoncomptable.com" (boîte Zoho du cabinet)
 *   TURNSTILE_SECRET    clé secrète Turnstile (si absente, la vérification Turnstile est sautée)
 */

interface Env {
  RESEND_API_KEY?: string;
  EMAIL_EXPEDITEUR?: string;
  EMAIL_DESTINATAIRE?: string;
  TURNSTILE_SECRET?: string;
}
interface Contexte { request: Request; env: Env }

const json = (donnees: unknown, statut = 200) =>
  new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  if (!env.RESEND_API_KEY || !env.EMAIL_EXPEDITEUR || !env.EMAIL_DESTINATAIRE) {
    return json({ erreur: "envoi non configuré" }, 503);
  }

  let f: FormData;
  try {
    f = await request.formData();
  } catch {
    return json({ erreur: "requête invalide" }, 400);
  }
  const champ = (nom: string, max = 200) => String(f.get(nom) ?? "").trim().slice(0, max);

  // Champ piège invisible : un humain le laisse vide, un robot le remplit. On fait semblant d'accepter.
  if (champ("site_web")) return json({ ok: true });

  const nom = champ("nom");
  const entreprise = champ("entreprise");
  const telephone = champ("telephone", 40);
  const email = champ("email", 120);
  const message = champ("message", 3000);
  const type = champ("type", 20) === "rendez-vous" ? "rendez-vous" : "question";
  const date = champ("date", 20);
  const moment = champ("moment", 40);
  const format = champ("format", 80);
  const anglais = champ("langue", 5) === "en";

  if (!nom || !telephone || !message || f.get("accord") !== "on") {
    return json({ erreur: "champs obligatoires manquants" }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ erreur: "adresse e-mail invalide" }, 400);
  }

  if (env.TURNSTILE_SECRET) {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: champ("cf-turnstile-response", 4096),
        remoteip: request.headers.get("CF-Connecting-IP") ?? "",
      }),
    });
    const resultat = (await verification.json().catch(() => ({}))) as { success?: boolean };
    if (!resultat.success) return json({ erreur: "vérification anti-spam échouée" }, 403);
  }

  const rdv = type === "rendez-vous";
  const sujet = `${anglais ? "[EN] " : ""}${rdv ? "Demande de rendez-vous" : "Question depuis le site"} : ${nom}`;
  const lignes: [string, string][] = [
    ["Type de demande", rdv ? "Demande de rendez-vous" : "Question"],
    ["Langue du visiteur", anglais ? "anglais (répondre en anglais)" : "français"],
    ["Nom et prénoms", nom],
    ["Entreprise", entreprise || "—"],
    ["Téléphone / WhatsApp", telephone],
    ["E-mail", email || "—"],
    ...(rdv ? ([["Date souhaitée", date || "—"], ["Moment", moment || "—"], ["Format", format || "—"]] as [string, string][]) : []),
  ];

  const texte = `${lignes.map(([l, v]) => `${l} : ${v}`).join("\n")}\n\nMessage :\n${message}\n\n— Envoyé depuis le formulaire du site horizoncomptable.com`;
  const html = `<div style="font-family:Georgia,serif;font-size:15px;color:#24180F;line-height:1.5">
  <p style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6E4426;margin:0 0 12px">${rdv ? "Demande de rendez-vous" : "Question"} depuis le site</p>
  <table style="border-collapse:collapse;margin-bottom:16px">${lignes
    .map(([l, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6E4426;vertical-align:top">${echapper(l)}</td><td style="padding:4px 0"><strong>${echapper(v)}</strong></td></tr>`)
    .join("")}</table>
  <p style="margin:0 0 6px;color:#6E4426">Message :</p>
  <p style="margin:0;white-space:pre-wrap">${echapper(message)}</p>
  <p style="margin-top:24px;font-size:12px;color:#8A6A4F">Envoyé depuis le formulaire du site horizoncomptable.com</p>
</div>`;

  let envoi: Response;
  try {
    envoi = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_EXPEDITEUR,
        to: [env.EMAIL_DESTINATAIRE],
        ...(email ? { reply_to: email } : {}),
        subject: sujet,
        text: texte,
        html,
      }),
    });
  } catch {
    return json({ erreur: "service d'envoi injoignable" }, 502);
  }
  if (!envoi.ok) return json({ erreur: "envoi impossible" }, 502);

  return json({ ok: true });
};
