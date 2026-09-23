const test = require('node:test');
const assert = require('node:assert');
const { toApiDate } = require('./scores365Api');

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

// ── הבקשה מול 365, עם fetch מוחלף ─────────────────────────────────
//
// הבדיקות האלה קיימות בגלל תקלות אמיתיות: נתיב שהחזיר 404 והפיל את כל
// הייבוא, ותשובה ריקה שנשמרה לשש שעות. שתיהן נראו במסך בדיוק כמו
// "אין משחקים בטווח".

const { fetchUpcomingFixtures } = require('./scores365Api');

const game = (id, day, competitionId = null) => ({
  id,
  competitionId,
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

test('נתיב שנפל מוחלף בנתיב אחר, והמשחקים נמשכים בכל זאת', async () => {
  const urls = [];
  const fixtures = await withFetch(
    (url) => {
      urls.push(url);
      // כך נראה מה שקרה בפועל: הנתיב הישן התחיל להחזיר 404
      if (url.includes('/games/fixtures/')) {
        return { ok: false, status: 404, json: async () => ({}), text: async () => 'HTTP Error 404' };
      }
      return ok([game(101, 24)]);
    },
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9101, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].apiId, '365_101');
});

test('הנתיב הראשון הוא זה של אתר 365, והוא נושא את הטווח', async () => {
  const urls = [];
  await withFetch(
    (url) => { urls.push(url); return ok([game(102, 24)]); },
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9102, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  // נתיב אחד שעובד - בקשה אחת. 365 חוסמים לפי IP על ריבוי בקשות
  assert.equal(urls.length, 1, urls.join('\n'));
  assert.match(urls[0], /\/games\/allscores\//);
  assert.match(urls[0], /startDate=20\/09\/2026&endDate=30\/09\/2026/);
});

test('כשכל הנתיבים נכשלו נזרקת שגיאה, ולא מוחזרת רשימה ריקה', async () => {
  await assert.rejects(
    () => withFetch(
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => 'HTTP Error 404' }),
      () => fetchUpcomingFixtures({
        scores365CompetitionId: 9103, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
      })
    ),
    /404/
  );
});

test('נתיב שענה בלי משחקים הוא תשובה, לא תקלה - שבוע ריק אינו שגיאה', async () => {
  const fixtures = await withFetch(
    () => ok([]),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9104, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );
  assert.deepEqual(fixtures, []);
});

test('תשובה ריקה אינה נשמרת בזיכרון, כדי שתקלה רגעית לא תימשך שעות', async () => {
  const id = 9105;
  const empty = await withFetch(() => ok([]), () => fetchUpcomingFixtures({
    scores365CompetitionId: id, fromDate: '2026-09-20', toDate: '2026-09-30'
  }));
  assert.equal(empty.length, 0);

  // בלי refresh: אילו הריק היה נשמר, הקריאה הבאה לא הייתה פונה לספק כלל
  const after = await withFetch(() => ok([game(501, 24)]), () => fetchUpcomingFixtures({
    scores365CompetitionId: id, fromDate: '2026-09-20', toDate: '2026-09-30'
  }));
  assert.equal(after.length, 1);
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

test('תשובה חלקית עדיפה על שגיאה: מה שנאסף מוחזר', async () => {
  const fixtures = await withFetch(
    (url) => (url.includes('/games/results/')
      // נתיב אחד מצליח והשני נכשל - מה שנאסף נשאר
      ? { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' }
      : ok([game(601, 24)])),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9107, fromDate: '2026-09-20', toDate: '2026-09-30',
      refresh: true, includePast: true
    })
  );

  assert.equal(fixtures.length, 1);
});

test('משחקים של תחרויות אחרות מסוננים, גם כשהספק מתעלם מהמסנן', async () => {
  // כך זה חזר בפועל: בקשה לליגת האומות והתשובה מלאה במשחקי נבחרות
  // עד גיל 23 מאסיה
  const fixtures = await withFetch(
    () => ok([
      game(701, 24, 9200),
      game(702, 25, 9999),
      game(703, 26, 9200),
      game(704, 27, 1234)
    ]),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9200, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.deepEqual(fixtures.map((f) => f.apiId), ['365_701', '365_703']);
});

test('משחק בלי מזהה תחרות נשמר - נתיב מסונן אינו חייב לציין אותו', async () => {
  const fixtures = await withFetch(
    () => ok([game(801, 24), game(802, 25)]),
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9201, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.equal(fixtures.length, 2);
});

test('כשבתשובה אין אף משחק של התחרות, מנסים את הנתיב הבא', async () => {
  const urls = [];
  const fixtures = await withFetch(
    (url) => {
      urls.push(url);
      // הלוח מחזיר המון משחקים, אף אחד מהם לא שלנו
      return url.includes('allscores')
        ? ok([game(901, 24, 5), game(902, 25, 6)])
        : ok([game(903, 26, 9202)]);
    },
    () => fetchUpcomingFixtures({
      scores365CompetitionId: 9202, fromDate: '2026-09-20', toDate: '2026-09-30', refresh: true
    })
  );

  assert.equal(urls.length, 2);
  assert.deepEqual(fixtures.map((f) => f.apiId), ['365_903']);
});
