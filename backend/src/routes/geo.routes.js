'use strict';

const express = require('express');
const router = express.Router();

/* ---------------- Cache sencilla en memoria ---------------- */
const CACHE = new Map();
function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) { CACHE.delete(key); return null; }
  return hit.val;
}
function cacheSet(key, val, ttlMs = 12 * 60 * 60 * 1000) { // 12h
  CACHE.set(key, { val, exp: Date.now() + ttlMs });
}

/* ---------------- Helpers fetch/json ---------------- */
async function jget(url) {
  const r = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'EasyTrack/1.0 (contact: admin@example.com)'
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ----------------- Nominatim por CP ----------------- */
async function nominatimByPostal(country, postal) {
  const cc = (country || '').toLowerCase(); // es, fr, etc.
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&addressdetails=1&limit=1&extratags=1` +
    `&postalcode=${encodeURIComponent(postal)}` +
    (cc ? `&countrycodes=${encodeURIComponent(cc)}` : '');

  const arr = await jget(url);
  const x = Array.isArray(arr) && arr[0];
  if (!x) return null;

  const population = Number(x?.extratags?.population || x?.population || 0) || null;
  const city = x?.address?.city || x?.address?.town || x?.address?.village || null;

  return { population, city, source: 'Nominatim(postal)' };
}

/* ------------- Nominatim por texto libre ------------- */
async function nominatimByQuery(q, country) {
  const cc = (country || '').toLowerCase();
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&addressdetails=1&limit=1&extratags=1&q=${encodeURIComponent(q)}` +
    (cc ? `&countrycodes=${encodeURIComponent(cc)}` : '');
  const arr = await jget(url);
  const x = Array.isArray(arr) && arr[0];
  if (!x) return null;

  const population = Number(x?.extratags?.population || x?.population || 0) || null;
  const city = x?.address?.city || x?.address?.town || x?.address?.village || null;
  return { population, city, source: 'Nominatim(query)' };
}

/* ---------------- Población desde Wikidata --------------- */
async function wikidataPopulationFor(placeName) {
  if (!placeName) return null;

  // 1) Wikipedia -> QID
  const api1 = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&origin=*&titles=${encodeURIComponent(placeName)}`;
  const j1 = await jget(api1);
  const pages = j1?.query?.pages || {};
  const first = pages[Object.keys(pages)[0]];
  const qid = first?.pageprops?.wikibase_item;
  if (!qid) return null;

  // 2) Wikidata -> P1082 (population) y escoger el más reciente
  const api2 = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const j2 = await jget(api2);
  const claims = j2?.entities?.[qid]?.claims?.P1082 || [];
  if (!Array.isArray(claims) || !claims.length) return null;

  const items = claims.map(c => {
    const amount = Number(c?.mainsnak?.datavalue?.value?.amount || 0);
    const tStr = c?.qualifiers?.P585?.[0]?.datavalue?.value?.time || null; // fecha de referencia
    const t = tStr ? Date.parse(String(tStr).replace('+','')) : 0;
    return { amount, t };
  }).filter(x => x.amount > 0);

  if (!items.length) return null;
  items.sort((a,b) => b.t - a.t);
  return { population: items[0].amount, source: 'Wikidata(municipio)' };
}

/* ------------------------- Route ------------------------- */
/**
 * GET /api/geo/population?country=ES&postal_code=12200&city=Onda&address=...
 * Devuelve: { ok:true, population: number|null, city: string|null, source: string|null }
 */
router.get('/population', async (req, res) => {
  try {
    const country = (req.query.country || req.query.cc || '').toString().trim() || 'ES';
    const postal  = (req.query.postal_code || req.query.cp || '').toString().trim();
    const city    = (req.query.city || '').toString().trim();
    const address = (req.query.address || '').toString().trim();

    const key = JSON.stringify({ country, postal, city: city.toLowerCase() });
    const cached = cacheGet(key);
    if (cached) return res.json({ ok: true, ...cached, cached: true });

    // 1) Por CP en Nominatim
    if (postal) {
      const np = await nominatimByPostal(country, postal).catch(() => null);
      if (np?.population) {
        cacheSet(key, np);
        return res.json({ ok: true, ...np });
      }
      // guarda ciudad si la obtuvo
      if (np?.city && !city) req.query.city = np.city;
    }

    // 2) Por consulta libre (por si address está bien formado)
    if (!city && address) {
      const nq = await nominatimByQuery(address, country).catch(() => null);
      if (nq?.population) {
        cacheSet(key, nq);
        return res.json({ ok: true, ...nq });
      }
      if (nq?.city) req.query.city = nq.city;
    }

    // 3) Wikidata por municipio/ciudad
    const cityName = (req.query.city || city || '').toString().trim();
    if (cityName) {
      const wd = await wikidataPopulationFor(cityName).catch(() => null);
      if (wd?.population) {
        const out = { population: wd.population, city: cityName, source: wd.source };
        cacheSet(key, out);
        return res.json({ ok: true, ...out });
      }
    }

    cacheSet(key, { population: null, city: cityName || null, source: null }, 2 * 60 * 60 * 1000);
    return res.json({ ok: true, population: null, city: cityName || null, source: null });
  } catch (e) {
    console.error('geo/population error', e);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;
