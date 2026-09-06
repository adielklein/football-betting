const test = require('node:test');
const assert = require('node:assert');
const { normalizeFinalScore, sameResult } = require('./resultCompare');

test('תוצאה זהה מזוהה כזהה ולא מדווחת כעדכון', () => {
  assert.strictEqual(sameResult({ team1Goals: 2, team2Goals: 1 }, { team1Goals: 2, team2Goals: 1 }), true);
});

test('תוצאה שהשתנתה מזוהה כעדכון', () => {
  assert.strictEqual(sameResult({ team1Goals: 2, team2Goals: 1 }, { team1Goals: 3, team2Goals: 1 }), false);
  assert.strictEqual(sameResult({ team1Goals: 1, team2Goals: 2 }, { team1Goals: 2, team2Goals: 1 }), false);
});

test('אין תוצאה קודמת - תמיד עדכון', () => {
  assert.strictEqual(sameResult(null, { team1Goals: 0, team2Goals: 0 }), false);
  assert.strictEqual(sameResult(undefined, { team1Goals: 1, team2Goals: 1 }), false);
});

test('0-0 אינו נחשב כ"אין תוצאה"', () => {
  assert.strictEqual(sameResult({ team1Goals: 0, team2Goals: 0 }, { team1Goals: 0, team2Goals: 0 }), true);
  assert.strictEqual(sameResult({ team1Goals: 0, team2Goals: 0 }, { team1Goals: 0, team2Goals: 1 }), false);
});

test('finalScore ריק של mongoose לא מזייף עדכון', () => {
  // זה בדיוק המקרה שנפל בייצור: mongoose החזיר אובייקט חי עם penalties ריק,
  // אף שבמסד לא היה שם כלום. לפני התיקון אותם 6 משחקים "התעדכנו" בכל שעה.
  const mongooseGhost = { team1Goals: 1, team2Goals: 1, finalScore: { penalties: {} } };
  const fromProvider = { team1Goals: 1, team2Goals: 1 };
  assert.strictEqual(sameResult(mongooseGhost, fromProvider), true);
  assert.strictEqual(normalizeFinalScore({ penalties: {} }), null);
});

test('הארכה מזוהה כשינוי אמיתי', () => {
  const noEt = { team1Goals: 1, team2Goals: 1 };
  const withEt = { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 2, team2Goals: 1 } };
  assert.strictEqual(sameResult(noEt, withEt), false);
  assert.strictEqual(sameResult(withEt, withEt), true);
});

test('פנדלים מזוהים כשינוי אמיתי, וזהים אינם', () => {
  const et = { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 1, team2Goals: 1 } };
  const pens = { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 1, team2Goals: 1, penalties: { team1: 4, team2: 3 } } };
  const otherPens = { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 1, team2Goals: 1, penalties: { team1: 5, team2: 4 } } };
  assert.strictEqual(sameResult(et, pens), false);
  assert.strictEqual(sameResult(pens, pens), true);
  assert.strictEqual(sameResult(pens, otherPens), false);
});

test('פנדלים חלקיים (0 שערים לצד אחד) נשמרים ולא נמחקים בנרמול', () => {
  assert.deepStrictEqual(
    normalizeFinalScore({ team1Goals: 0, team2Goals: 0, penalties: { team1: 0, team2: 3 } }),
    { team1Goals: 0, team2Goals: 0, penalties: { team1: 0, team2: 3 } }
  );
});
