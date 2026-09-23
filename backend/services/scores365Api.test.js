const test = require('node:test');
const assert = require('node:assert');
const { toApiDate, nextPageOf } = require('./scores365Api');

test('הטווח נשלח בפורמט ש-365 מצפים לו', () => {
  assert.equal(toApiDate('2026-09-23'), '23/09/2026');
  // אפסים מובילים נשמרים - "3/9" אינו אותו דבר
  assert.equal(toApiDate('2026-01-05'), '05/01/2026');
});

test('תאריך חסר או פגום לא מייצר טווח שבור', () => {
  for (const value of ['', null, undefined, 'לא תאריך']) {
    assert.equal(toApiDate(value), '', String(value));
  }
});

test('עמוד המשך מזוהה בכל הצורות שהספק מחזיר', () => {
  assert.equal(nextPageOf({ paging: { nextPage: '/games/fixtures/?page=2' } }), '/games/fixtures/?page=2');
  assert.equal(nextPageOf({ nextPage: '/games/results/?page=3' }), '/games/results/?page=3');
  // כתובת מלאה נחתכת לנתיב, כי apiGet מוסיף את הבסיס בעצמו
  assert.equal(
    nextPageOf({ paging: { nextPage: 'https://webws.365scores.com/web/games/fixtures/?page=4' } }),
    '/web/games/fixtures/?page=4'
  );
});

test('כשאין עמוד המשך מוחזר null, ולא ערך שיגרום לבקשה נוספת', () => {
  for (const json of [{}, null, { paging: {} }, { paging: { nextPage: '' } }, { nextPage: 7 }, { nextPage: 'page=2' }]) {
    assert.equal(nextPageOf(json), null, JSON.stringify(json));
  }
});

// ── הבקשה מול 365, עם fetch מוחלף ─────────────────────────────────
//
// הבדיקות האלה קיימות בגלל תקלה אמיתית: בקשת הטווח נשלחה ראשונה, הספק
// דחה את הפרמטרים, והחריגה קפצה מעל הניסיון החוזר - כך שלא נמשך שום
// משחק. תוספת שיכולה להפיל את מה שעבד אינה תוספת.

const { fetchUpcomingFixtures } = require('./scores365Api');

const game = (id, day) => ({
  id,
  startTime: `2026-09-${String(day).padStart(2, '0')}T18:00:00Z`,
  homeCompetitor: { id: id * 10, name: `בית ${id}` },
  awayCompetitor: { id: id * 10 + 1, name: `חוץ ${id}` }
});

const withFetch = async (handler, run) => {
  const original = global.fetch;
  global.fetch = async (url) => handler(String(url));
  try {
    return await run();
  } finally {
    global.fetch = original;
  }
};

const ok = (games) => ({
  ok: true,
  status: 200,
  json: async () => ({ games }),
  text: async () => ''
});

const fail = () => ({ ok: false, status: 400, json: async () => ({}), text: async () => 'bad request' });

test('טווח שנדחה לא מבטל את המשחקים שכבר נמשכו', async () => {
  const fixtures = await withFetch(
    (url) => (url.includes('startDate') ? fail() : ok([game(101, 24)])),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9001, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].apiId, '365_101');
});

test('משחקים מהטווח מתווספים לאלה של ברירת המחדל, בלי כפילות', async () => {
  const fixtures = await withFetch(
    (url) => (url.includes('startDate')
      // הטווח מחזיר גם משחק שכבר נמשך וגם אחד שלא היה בעמוד
      ? ok([game(101, 24), game(102, 25)])
      : ok([game(101, 24)])),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9002, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.deepEqual(fixtures.map((f) => f.apiId).sort(), ['365_101', '365_102']);
});

test('משחק מחוץ לטווח שהספק החזיר בכל זאת - מסונן', async () => {
  const fixtures = await withFetch(
    () => ok([game(103, 24), game(104, 5)]),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9003, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.deepEqual(fixtures.map((f) => f.apiId), ['365_103']);
});
