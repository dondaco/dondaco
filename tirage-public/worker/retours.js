// Service gratuit de recueil des retours (Cloudflare Worker + KV, offre gratuite, sans IA et sans clé API).
// POST /retour            : enregistre un retour anonyme envoyé depuis la page retour.html du site
// GET  /retours?depuis=AAAA-MM-JJ&cle=... : liste les retours reçus depuis cette date (pour la mise à jour quotidienne)
// Liaison KV requise sous le nom RETOURS. Variable secrète facultative LECTURE_CLE : si elle existe, GET exige ?cle=.

const ALLOWED_ORIGINS = ["https://dondaco.github.io"];
const MAX_PER_DAY = 10; // retours par jour et par visiteur
const hits = new Map();
const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}
const json = (d, s, h) => new Response(JSON.stringify(d), { status: s || 200, headers: h });

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const h = headers(origin);
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

    if (request.method === "GET" && url.pathname.replace(/\/+$/, "") === "/retours") {
      if (env.LECTURE_CLE && url.searchParams.get("cle") !== env.LECTURE_CLE) return json({ error: "forbidden" }, 403, h);
      const since = (url.searchParams.get("depuis") || "").replace(/[^0-9-]/g, "") || new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const out = [];
      let cursor;
      do {
        const page = await env.RETOURS.list({ prefix: "r:", cursor });
        for (const k of page.keys) if (k.name.slice(2, 12) >= since) {
          const v = await env.RETOURS.get(k.name, "json");
          if (v) out.push({ id: k.name.slice(2).replace(/[^A-Za-z0-9_-]/g, "-"), ...v });
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return json({ depuis: since, retours: out }, 200, h);
    }

    if (request.method === "POST" && url.pathname.replace(/\/+$/, "") === "/retour") {
      if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden" }, 403, h);
      const ip = request.headers.get("CF-Connecting-IP") || "?", now = Date.now();
      const list = (hits.get(ip) || []).filter(t => now - t < 864e5);
      if (list.length >= MAX_PER_DAY) return json({ error: "rate_limited" }, 429, h);
      let d; try { d = await request.json(); } catch { return json({ error: "bad_request" }, 400, h); }
      const item = {
        tirage: clip(d.tirage, 120),
        couleurs: (Array.isArray(d.couleurs) ? d.couleurs : []).slice(0, 7).map(c => clip(c, 40)),
        cotes: (Array.isArray(d.cotes) ? d.cotes : []).slice(0, 7).map(c => clip(c, 20)),
        lecon: clip(d.lecon, 400),
        note: Math.max(1, Math.min(5, parseInt(d.note) || 3)),
        date: new Date().toISOString().slice(0, 10),
      };
      if (!item.tirage || !item.lecon || !d.consentement) return json({ error: "bad_request" }, 400, h);
      list.push(now); hits.set(ip, list);
      const key = "r:" + item.date + "-" + crypto.randomUUID().slice(0, 8);
      await env.RETOURS.put(key, JSON.stringify(item), { expirationTtl: 60 * 60 * 24 * 90 }); // gardé 90 jours, le temps d'être importé
      return json({ ok: true }, 200, h);
    }
    return json({ error: "not_found" }, 404, h);
  },
};
