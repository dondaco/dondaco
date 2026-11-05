// Service relais pour « Couleurs du moment » (Cloudflare Worker).
// Il reçoit un tirage depuis le site, demande l'interprétation à Claude avec TA clé API
// (stockée comme secret ANTHROPIC_API_KEY dans Cloudflare, jamais visible dans la page),
// et renvoie la réponse au site. Il n'accepte que les tirages, pas des questions libres.

const ALLOWED_ORIGINS = ["https://dondaco.github.io"];
const MODEL = "claude-haiku-5-5";
const MAX_PER_HOUR = 20; // tirages interprétés par heure et par visiteur (approximatif)

const hits = new Map(); // compteur en mémoire, par adresse IP (remis à zéro quand le service redémarre)

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
const clip = (v, n) => String(v ?? "").slice(0, n);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = { ...cors(origin), "Content-Type": "application/json; charset=utf-8" };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST" || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
    }

    // Limite simple contre les abus
    const ip = request.headers.get("CF-Connecting-IP") || "?";
    const now = Date.now(), hour = 3600e3;
    const list = (hits.get(ip) || []).filter(t => now - t < hour);
    if (list.length >= MAX_PER_HOUR) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    list.push(now); hits.set(ip, list);

    let d;
    try { d = await request.json(); } catch { return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers }); }
    const cartes = (Array.isArray(d.cartes) ? d.cartes : []).slice(0, 7).map(c => ({
      position: clip(c.position, 120), sens_de_la_position: clip(c.sens_de_la_position, 300), couleur: clip(c.couleur, 40),
      cote: clip(c.cote, 60), phrase_cle: clip(c.phrase_cle, 120),
      phrases_retenues: (Array.isArray(c.phrases_retenues) ? c.phrases_retenues : []).slice(0, 10).map(p => clip(p, 160)),
    }));
    if (!cartes.length) return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers });
    const question = clip(d.question, 400);

    const prompt =
      "Voici un tirage de cartes de couleurs fait pour réfléchir sur soi. Tirage : « " + clip(d.tirage, 120) + " » (" + clip(d.consigne, 400) + "). " +
      "Question de la personne : " + (question ? "« " + question + " »" : "pas de question précise") + ". " +
      "Cartes, sens de leur position et phrases qui lui ont parlé : " + JSON.stringify(cartes) + ". " +
      "Fais-lui une conclusion en la tutoyant : une piste courte pour chaque carte en lien avec sa question, puis une synthèse de 3 ou 4 phrases qui répond à sa question, puis 2 questions à se poser. " +
      "Ce sont des pistes de réflexion, jamais des certitudes ni des prédictions, sans conseil médical, juridique ou financier. " +
      "Réponds uniquement en JSON : {\"cartes\": [\"...\"], \"synthese\": \"...\", \"questions\": [\"...\", \"...\"]}.";

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: "upstream_" + r.status }), { status: 502, headers });
    const out = await r.json();
    const text = (out.content || []).map(b => b.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    try { return new Response(JSON.stringify(JSON.parse(m ? m[0] : text)), { headers }); }
    catch { return new Response(JSON.stringify({ synthese: text.trim() }), { headers }); }
  },
};
