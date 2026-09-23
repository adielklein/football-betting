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
