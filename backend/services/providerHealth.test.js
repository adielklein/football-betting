const test = require('node:test');
const assert = require('node:assert');
const providerHealth = require('./providerHealth');
const liveScores = require('./liveScores');

test('כישלונות ברצף נספרים ומתאפסים בהצלחה', () => {
  providerHealth.reset();
  providerHealth.record('365 חי', { ok: false, status: 403, message: 'Forbidden' });
  providerHealth.record('365 חי', { ok: false, status: 403, message: 'Forbidden' });
  let [s] = providerHealth.snapshot();
  assert.equal(s.consecutiveFailures, 2);
  assert.equal(s.lastError.status, 403);

  providerHealth.record('365 חי', { ok: true, status: 200 });
  [s] = providerHealth.snapshot();
  assert.equal(s.consecutiveFailures, 0);
  assert.ok(s.lastOkAt);
  assert.equal(s.lastError.status, 403, 'השגיאה האחרונה נשמרת גם אחרי הצלחה');
  assert.deepStrictEqual(s.recent.map((r) => r.ok), [true, false, false]);
});

test('הפרמטרים הקבועים יורדים מהנתיב כדי שיהיה קריא', () => {
  providerHealth.reset();
  providerHealth.record('x', { ok: true, path: '/games/current/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&games=1,2' });
  assert.equal(providerHealth.snapshot()[0].recent[0].path, '/games/current/?games=1,2');
});

test('קריאה חיה שנחסמה נרשמת עם הסטטוס והטקסט של 365', async () => {
  providerHealth.reset();
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 403, text: async () => 'Access denied by Cloudflare' });
  try {
    const result = await liveScores.probe();
    assert.equal(result.ok, false);
    assert.match(result.message, /403/);
    assert.match(result.message, /Cloudflare/, 'הטקסט מהספק מגיע עד המסך');
    const s = providerHealth.snapshot().find((p) => p.source === '365 חי');
    assert.equal(s.lastError.status, 403);
    assert.match(s.lastError.message, /Cloudflare/);
  } finally {
    global.fetch = realFetch;
  }
});

test('קריאה חיה בלי חיבור בכלל נרשמת כ"אין חיבור"', async () => {
  providerHealth.reset();
  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error('getaddrinfo ENOTFOUND'); };
  try {
    const result = await liveScores.probe();
    assert.equal(result.ok, false);
    const s = providerHealth.snapshot().find((p) => p.source === '365 חי');
    assert.match(s.lastError.message, /אין חיבור/);
    assert.equal(s.lastError.status, null);
  } finally {
    global.fetch = realFetch;
  }
});

test('בדיקה מוצלחת מחזירה כמה משחקים הגיעו', async () => {
  providerHealth.reset();
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ games: [{}, {}, {}] }) });
  try {
    const result = await liveScores.probe();
    assert.deepStrictEqual({ ok: result.ok, games: result.games }, { ok: true, games: 3 });
    assert.equal(providerHealth.snapshot()[0].okCount, 1);
  } finally {
    global.fetch = realFetch;
  }
});
