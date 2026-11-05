// Service relais pour « Couleurs du moment » (Cloudflare Worker).
// - /interpretation : demande à Claude une conclusion sur un tirage, en s'inspirant des retours passés bien reçus
// - /echange        : conversation courte avec la personne sur la façon dont elle reçoit son tirage
// - /retour         : enregistre (si la personne l'accepte) un retour anonyme et en tire une « leçon » pour les prochains tirages
// La clé API reste ici, en secret (ANTHROPIC_API_KEY). Les retours sont stockés dans un espace KV lié sous le nom RETOURS.

const ALLOWED_ORIGINS = ["https://dondaco.github.io"];
const MODEL = "claude-haiku-5-5";
const MAX_PER_HOUR = 40;          // appels par heure et par visiteur (approximatif)
const MAX_TURNS = 8;              // messages de la personne dans un échange
const hits = new Map();

const clip = (v, n) => String(v ?? "").slice(0, n);
const json = (data, status, headers) => new Response(JSON.stringify(data), { status: status || 200, headers });

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

async function claude(env, system, messages, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens || 900, system, messages }),
  });
  if (!r.ok) throw new Error("upstream_" + r.status);
  const out = await r.json();
  return (out.content || []).map(b => b.text || "").join("").trim();
}
const parseJson = t => { const m = t.match(/\{[\s\S]*\}/); try { return JSON.parse(m ? m[0] : t); } catch { return null; } };

function cleanDraw(d) {
  const cartes = (Array.isArray(d.cartes) ? d.cartes : []).slice(0, 7).map(c => ({
    position: clip(c.position, 120), sens_de_la_position: clip(c.sens_de_la_position, 300), couleur: clip(c.couleur, 40),
    cote: clip(c.cote, 60), phrase_cle: clip(c.phrase_cle, 120),
    phrases_retenues: (Array.isArray(c.phrases_retenues) ? c.phrases_retenues : []).slice(0, 10).map(p => clip(p, 160)),
  }));
  return { tirage: clip(d.tirage, 120), consigne: clip(d.consigne, 400), question: clip(d.question, 400), cartes };
}

const SYSTEM = "Tu accompagnes des personnes qui font un tirage de cartes de couleurs pour réfléchir sur elles-mêmes. " +
  "Tu tutoies, tu écris en français simple et chaleureux. Tu proposes des pistes de réflexion, jamais des certitudes ni des prédictions. " +
  "Tu ne donnes aucun conseil médical, juridique ou financier ; si la personne évoque une détresse ou un danger, tu l'invites avec douceur à parler à un proche ou à un professionnel. " +
  "Tu ne parles que du tirage et de ce qu'il éveille ; pour tout autre sujet, tu ramènes gentiment la conversation au tirage.";

// Leçons tirées des retours passés pour ce tirage et ces couleurs (anonymes)
async function lessonsFor(env, draw) {
  if (!env.RETOURS) return [];
  const keys = ["t:" + draw.tirage, ...draw.cartes.map(c => "c:" + c.couleur + ":" + c.cote.split(" ")[0])];
  const lists = await Promise.all(keys.map(k => env.RETOURS.get(k, "json").catch(() => null)));
  const seen = new Set(), out = [];
  for (const l of lists) for (const x of (l || [])) if (!seen.has(x.lecon)) { seen.add(x.lecon); out.push(x); }
  return out.sort((a, b) => b.note - a.note).slice(0, 6);
}
async function addLesson(env, key, item) {
  const list = (await env.RETOURS.get(key, "json").catch(() => null)) || [];
  list.unshift(item);
  await env.RETOURS.put(key, JSON.stringify(list.slice(0, 30)));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST" || !ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden" }, 403, headers);

    const ip = request.headers.get("CF-Connecting-IP") || "?";
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
    if (list.length >= MAX_PER_HOUR) return json({ error: "rate_limited" }, 429, headers);
    list.push(now); hits.set(ip, list);

    let d;
    try { d = await request.json(); } catch { return json({ error: "bad_request" }, 400, headers); }
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/interpretation";
    const draw = cleanDraw(d);
    if (!draw.cartes.length) return json({ error: "bad_request" }, 400, headers);

    try {
      if (path === "/interpretation" || path === "") {
        const lessons = await lessonsFor(env, draw);
        const inspiration = lessons.length
          ? "Voici ce que d'autres personnes ont dit avoir bien ou mal reçu lors de tirages proches (anonyme) ; inspire-t'en sans le recopier : " + JSON.stringify(lessons.map(l => l.lecon)) + ". "
          : "";
        const prompt = "Tirage : « " + draw.tirage + " » (" + draw.consigne + "). Question : " + (draw.question ? "« " + draw.question + " »" : "pas de question précise") + ". " +
          "Cartes, sens de leur position et phrases qui ont parlé à la personne : " + JSON.stringify(draw.cartes) + ". " + inspiration +
          "Écris une piste courte pour chaque carte en lien avec la question, puis une synthèse de 3 ou 4 phrases qui répond à la question, puis 2 questions à se poser. " +
          "Réponds uniquement en JSON : {\"cartes\": [\"...\"], \"synthese\": \"...\", \"questions\": [\"...\", \"...\"]}.";
        const t = await claude(env, SYSTEM, [{ role: "user", content: prompt }], 900);
        return json(parseJson(t) || { synthese: t }, 200, headers);
      }

      if (path === "/echange") {
        const conclusion = clip(d.conclusion, 2500);
        const msgs = (Array.isArray(d.messages) ? d.messages : []).slice(-2 * MAX_TURNS)
          .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: clip(m.content, 800) })).filter(m => m.content);
        if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "bad_request" }, 400, headers);
        if (msgs.filter(m => m.role === "user").length > MAX_TURNS) return json({ reponse: "Merci pour cet échange. Je te laisse avec ce que tu as découvert ; tu peux refaire un tirage quand tu veux." }, 200, headers);
        const context = "Contexte du tirage : « " + draw.tirage + " ». Question : " + (draw.question || "aucune") + ". Cartes : " + JSON.stringify(draw.cartes) +
          ". Conclusion qui lui a été proposée : " + conclusion + ". La personne te dit maintenant comment elle reçoit ce tirage. " +
          "Écoute, reformule ce qui la touche, aide-la à préciser ce qui résonne ou non, en 2 à 5 phrases, et termine souvent par une question ouverte.";
        const t = await claude(env, SYSTEM + " " + context, msgs, 500);
        return json({ reponse: t }, 200, headers);
      }

      if (path === "/retour") {
        const note = Math.max(1, Math.min(5, parseInt(d.note) || 3));
        if (!d.consentement || !env.RETOURS) return json({ ok: true, enregistre: false }, 200, headers);
        const exchange = (Array.isArray(d.messages) ? d.messages : []).slice(-16).map(m => (m.role === "assistant" ? "Guide : " : "Personne : ") + clip(m.content, 600)).join("\n");
        const t = await claude(env, "Tu résumes des retours d'expérience de façon strictement anonyme : aucun prénom, lieu, date, détail identifiant ni élément de vie privée. Réponds en JSON.",
          [{ role: "user", content: "Tirage « " + draw.tirage + " », cartes : " + JSON.stringify(draw.cartes.map(c => ({ position: c.position, couleur: c.couleur, cote: c.cote }))) +
            ". Conclusion proposée : " + clip(d.conclusion, 2000) + ". Note donnée par la personne : " + note + "/5. Échange :\n" + exchange +
            "\nTire en une ou deux phrases une leçon générale et anonyme pour mieux interpréter ce tirage ou ces couleurs la prochaine fois (formulations qui ont touché, angle qui a manqué). " +
            "Réponds en JSON {\"lecon\": \"...\"}." }], 300);
        const lecon = clip((parseJson(t) || {}).lecon || "", 400);
        if (lecon) {
          const item = { lecon, note, date: new Date().toISOString().slice(0, 10) };
          await addLesson(env, "t:" + draw.tirage, item);
          for (const c of draw.cartes) await addLesson(env, "c:" + c.couleur + ":" + c.cote.split(" ")[0], item);
        }
        return json({ ok: true, enregistre: !!lecon }, 200, headers);
      }
      return json({ error: "not_found" }, 404, headers);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502, headers);
    }
  },
};
