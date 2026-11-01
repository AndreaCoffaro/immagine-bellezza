// Statistiche aggregate: nessun cookie, identificativo visitatore o IP salvato.
// Archivio persistente Upstash Redis REST; lettura riservata a chi può scrivere nel repository.
const pages = require('../lib/analytics-pages.json');
const REPO = 'AndreaCoffaro/immagine-bellezza';
const SITE = 'https://www.immaginebellezzamantio.it';
const TTL = 100 * 86400;

function day(date) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(date);
}

async function redis(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const error = new Error('Collega un database Redis su Vercel e configura UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN. Vedi STATISTICHE.md.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Redis non disponibile');
  const results = await response.json();
  if (!Array.isArray(results) || results.some(r => r.error)) throw new Error('Errore Redis');
  return results.map(r => r.result);
}

function source(referrer) {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === new URL(SITE).hostname || host === 'immaginebellezzamantio.it') return 'Interna';
    if (/^(www\.)?google\.[a-z.]+$/.test(host)) return 'Google';
    if (/(^|\.)bing\.com$/.test(host)) return 'Bing';
    if (/(^|\.)instagram\.com$/.test(host)) return 'Instagram';
    if (/(^|\.)facebook\.com$/.test(host) || host === 'fb.me') return 'Facebook';
    return 'Altri siti';
  } catch (_) { return 'Diretta / sconosciuta'; }
}

async function authorized(req) {
  const header = req.headers.authorization || '';
  if (!/^Bearer [A-Za-z0-9_]+$/.test(header)) return false;
  const response = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { Authorization: header, Accept: 'application/vnd.github+json', 'User-Agent': 'immagine-bellezza-admin' },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401 || response.status === 403 || response.status === 404) return false;
  if (!response.ok) throw new Error('GitHub non disponibile');
  return (await response.json()).permissions?.push === true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  const reply = (status, body) => { res.statusCode = status; res.end(body ? JSON.stringify(body) : ''); };
  try {
    if (req.method === 'POST') {
      // I browser di altri siti non possono inviare eventi. Nessun CORS abilitato.
      if (req.headers.origin !== SITE || req.headers['sec-fetch-site'] === 'cross-site') return reply(403, { error: 'Origine non consentita' });
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'Formato non valido' });
      if (Number(req.headers['content-length']) > 2048) return reply(413, { error: 'Richiesta troppo grande' });
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      if (Buffer.byteLength(raw) > 2048) return reply(413, { error: 'Richiesta troppo grande' });
      let body;
      try { body = JSON.parse(raw); } catch (_) { return reply(400, { error: 'JSON non valido' }); }
      if (!body || !pages.includes(body.path) || !['view', 'whatsapp', 'phone', 'email'].includes(body.event)) return reply(400, { error: 'Evento non valido' });
      const ua = req.headers['user-agent'] || '';
      if (/bot|crawler|spider|headless|preview|lighthouse/i.test(ua) || req.headers.dnt === '1' || req.headers['sec-gpc'] === '1') return reply(204);
      const device = /ipad|tablet/i.test(ua) ? 'Tablet' : /mobile|iphone|android/i.test(ua) ? 'Cellulare' : 'Computer';
      const fields = body.event === 'view'
        ? ['view', `page:${body.path}`, `source:${source(body.referrer)}`, `device:${device}`]
        : [body.event];
      // Un solo comando atomico: contatori coerenti, scadenza e limite giornaliero anti-abuso.
      const script = "local n=tonumber(redis.call('HGET',KEYS[1],'events') or '0'); if n>=100000 then return 0 end; redis.call('HINCRBY',KEYS[1],'events',1); for i=2,#ARGV do redis.call('HINCRBY',KEYS[1],ARGV[i],1) end; redis.call('EXPIRE',KEYS[1],ARGV[1]); return 1";
      await redis([['EVAL', script, 1, `analytics:${day(new Date())}`, TTL, ...fields]]);
      return reply(204);
    }
    if (req.method === 'GET') {
      if (!await authorized(req)) return reply(401, { error: 'Accedi con un account GitHub autorizzato a gestire il sito.' });
      const days = Number(new URL(req.url, SITE).searchParams.get('days') || 30);
      if (![7, 30, 90].includes(days)) return reply(400, { error: 'Periodo non valido' });
      // Mezzogiorno a Roma evita salti di data nei passaggi ora solare/legale.
      const today = day(new Date());
      const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date(`${today}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() - (days - 1 - i));
        return day(date);
      });
      const rows = await redis(dates.map(d => ['HGETALL', `analytics:${d}`]));
      const totals = { view: 0, whatsapp: 0, phone: 0, email: 0 };
      const groups = { pages: {}, sources: {}, devices: {} };
      const daily = rows.map((row, index) => {
        const values = {};
        for (let i = 0; i < (row || []).length; i += 2) values[row[i]] = Number(row[i + 1]) || 0;
        for (const field of Object.keys(totals)) totals[field] += values[field] || 0;
        for (const [prefix, group] of [['page:', 'pages'], ['source:', 'sources'], ['device:', 'devices']]) {
          for (const [key, value] of Object.entries(values)) if (key.startsWith(prefix)) {
            const label = key.slice(prefix.length);
            groups[group][label] = (groups[group][label] || 0) + value;
          }
        }
        return { date: dates[index], views: values.view || 0 };
      });
      return reply(200, { days, timezone: 'Europe/Rome', totals, daily, ...groups });
    }
    res.setHeader('Allow', 'GET, POST');
    return reply(405, { error: 'Metodo non consentito' });
  } catch (error) {
    return reply(error.status || 502, { error: error.status === 503 ? error.message : 'Statistiche temporaneamente non disponibili. Riprova tra poco.' });
  }
};
