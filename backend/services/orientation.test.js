const test = require('node:test');
const assert = require('node:assert');
const { buildDetector } = require('./orientation');

// השוואת שמות פשוטה לצורך הבדיקה - הלוגיקה הנבדקת היא ההכרעה, לא הזיהוי
const sameTeam = (a, b) => !!a && !!b && a === b;
const detect = buildDetector(sameTeam);

test('סדר תואם - לא הפוך, וודאי', () => {
  assert.deepStrictEqual(
    detect('ארסנל', 'צלסי', 'ארסנל', 'צלסי'),
    { flipped: false, confident: true }
  );
});

test('סדר הפוך - מזוהה, וודאי', () => {
  assert.deepStrictEqual(
    detect('צלסי', 'ארסנל', 'ארסנל', 'צלסי'),
    { flipped: true, confident: true }
  );
});

test('רק קבוצה אחת מזוהה - השנייה מכריעה לבדה', () => {
  // team1 לא מזוהה בכלל, אבל team2 תואם ל-away: הסדר ישר
  assert.deepStrictEqual(
    detect('שם לא מוכר', 'צלסי', 'ארסנל', 'צלסי'),
    { flipped: false, confident: true }
  );
  // team2 תואם דווקא ל-home: הסדר הפוך
  assert.deepStrictEqual(
    detect('שם לא מוכר', 'ארסנל', 'ארסנל', 'צלסי'),
    { flipped: true, confident: true }
  );
});

test('רק team1 מזוהה - מכריע לבדו', () => {
  assert.deepStrictEqual(
    detect('צלסי', 'שם לא מוכר', 'ארסנל', 'צלסי'),
    { flipped: true, confident: true }
  );
});

test('שני השמות לא מזוהים - סדר טבעי, אך לא ודאי', () => {
  // זה המקרה שהלוגיקה הישנה טיפלה בו בשקט: היא הייתה מחזירה "לא הפוך"
  // בלי שום דרך להבחין בין ידיעה לניחוש.
  assert.deepStrictEqual(
    detect('אלמוני', 'פלמוני', 'ארסנל', 'צלסי'),
    { flipped: false, confident: false }
  );
});

test('זיהוי סותר - שתי הקבוצות תואמות לשני הצדדים - לא ודאי', () => {
  const alwaysMatch = () => true;
  assert.deepStrictEqual(
    buildDetector(alwaysMatch)('א', 'ב', 'ג', 'ד'),
    { flipped: false, confident: false }
  );
});

test('שמות חסרים אצל הספק לא מפילים את החישוב', () => {
  assert.deepStrictEqual(
    detect('ארסנל', 'צלסי', null, undefined),
    { flipped: false, confident: false }
  );
});

test('ההכרעה עקבית: היפוך הקלט מהפך את התשובה', () => {
  const pairs = [
    ['ארסנל', 'צלסי'],
    ['שם לא מוכר', 'צלסי'],
    ['ארסנל', 'שם לא מוכר']
  ];
  for (const [a, b] of pairs) {
    const straight = detect(a, b, 'ארסנל', 'צלסי');
    const reversed = detect(b, a, 'ארסנל', 'צלסי');
    if (straight.confident) {
      assert.strictEqual(reversed.confident, true, `${a}/${b}`);
      assert.strictEqual(reversed.flipped, !straight.flipped, `${a}/${b}`);
    }
  }
});
