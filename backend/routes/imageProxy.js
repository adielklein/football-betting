// GET /api/image-proxy?u=<url> - מעביר תמונת סמל מאתר חיצוני עם כותרת CORS.
//
// התלת-ממד (סמל בכותרת, חולצות) מצייר את הסמלים כטקסטורה ב-WebGL, וזה
// מותר רק לתמונות שהשרת שלהן מרשה (CORS). רוב אתרי הסמלים לא מרשים, ובלי
// המעבר הזה הסמל היה נעלם בזמן הסיבוב. רק אתרים מרשימה סגורה - זה לא פרוקסי
// כללי - ורק תמונות, עד 2MB, עם קאש קצר בזיכרון ובדפדפן.
const express = require('express');
const router = express.Router();

const ALLOWED_HOSTS = new Set([
  'imagecache.365scores.com',
  'cdn.freebiesupply.com',
  'upload.wikimedia.org',
  'football-logos.cc',
  'r2.thesportsdb.com',
  'www.thesportsdb.com',
  'www.htafc.co.il',
  'maccabi.co.il',
]);
const MAX_BYTES = 2 * 1024 * 1024;
const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map(); // url -> { type, body, at }

const isAllowed = (raw) => {
  try {
    const u = new URL(raw);
    return (u.protocol === 'https:' || u.protocol === 'http:') && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
};

router.get('/', async (req, res) => {
  const url = String(req.query.u || '');
  if (!isAllowed(url)) return res.status(400).json({ message: 'host not allowed' });

  const send = (hit) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=604800');
    res.type(hit.type).send(hit.body);
  };

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return send(hit);

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' }, redirect: 'follow' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return res.status(502).json({ message: `upstream ${r.status}` });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return res.status(413).json({ message: 'too large' });
    const entry = { type, body: buf, at: Date.now() };
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    cache.set(url, entry);
    return send(entry);
  } catch (err) {
    return res.status(502).json({ message: err.message });
  }
});

module.exports = router;
module.exports.isAllowed = isAllowed;
