// בדיקות ללוגיקת הניקוד. הרצה: npm test (מריץ את node --test, בלי תלויות נוספות).
const test = require('node:test');
const assert = require('node:assert');
const { calculateMatchPoints, outcomeOf } = require('./scoring');

const bet = (a, b) => ({ team1Goals: a, team2Goals: b });
const res = (a, b) => ({ team1Goals: a, team2Goals: b });
const ODDS = { homeWin: 1.5, draw: 3.9, awayWin: 6.2 };

test('ללא יחסים: תוצאה מדויקת = 3 נקודות', () => {
  assert.strictEqual(calculateMatchPoints(bet(2, 1), res(2, 1), null), 3);
  assert.strictEqual(calculateMatchPoints(bet(0, 0), res(0, 0), null), 3);
  assert.strictEqual(calculateMatchPoints(bet(0, 3), res(0, 3), null), 3);
});

test('ללא יחסים: כיוון נכון = נקודה', () => {
  assert.strictEqual(calculateMatchPoints(bet(2, 1), res(3, 0), null), 1); // ניצחון בית
  assert.strictEqual(calculateMatchPoints(bet(1, 1), res(2, 2), null), 1); // תיקו
  assert.strictEqual(calculateMatchPoints(bet(0, 1), res(1, 4), null), 1); // ניצחון חוץ
});

test('ללא יחסים: כיוון שגוי = 0', () => {
  assert.strictEqual(calculateMatchPoints(bet(2, 1), res(1, 2), null), 0);
  assert.strictEqual(calculateMatchPoints(bet(1, 1), res(2, 0), null), 0);
  assert.strictEqual(calculateMatchPoints(bet(2, 0), res(1, 1), null), 0);
});

test('המשחק אינו סימטרי: ניחוש הפוך אינו מזכה בניקוד של המדויק', () => {
  // הבאג הזה נתפס בייצור - תוצאות שהוצגו הפוך. אם החישוב יתבלבל בין
  // team1 ל-team2, הבדיקה הזו תיפול.
  assert.strictEqual(calculateMatchPoints(bet(3, 1), res(1, 3), null), 0);
  assert.strictEqual(calculateMatchPoints(bet(1, 3), res(1, 3), null), 3);
});

test('עם יחסים: מדויק = יחס * 2/3, מעוגל לעשירית', () => {
  // התוצאה 2-1 היא ניצחון בית, ולכן נלקח homeWin = 1.5 → 1.0
  assert.strictEqual(calculateMatchPoints(bet(2, 1), res(2, 1), ODDS), 1);
  // 1-1 תיקו → draw 3.9 * 2/3 = 2.6
  assert.strictEqual(calculateMatchPoints(bet(1, 1), res(1, 1), ODDS), 2.6);
  // 0-2 ניצחון חוץ → awayWin 6.2 * 2/3 = 4.133 → 4.1
  assert.strictEqual(calculateMatchPoints(bet(0, 2), res(0, 2), ODDS), 4.1);
});

test('עם יחסים: כיוון נכון = יחס / 3', () => {
  assert.strictEqual(calculateMatchPoints(bet(3, 0), res(2, 1), ODDS), 0.5); // 1.5/3
  assert.strictEqual(calculateMatchPoints(bet(2, 2), res(1, 1), ODDS), 1.3); // 3.9/3
  assert.strictEqual(calculateMatchPoints(bet(0, 1), res(0, 2), ODDS), 2.1); // 6.2/3 = 2.066
});

test('עם יחסים: היחס נקבע לפי מה שקרה, לא לפי מה שנוחש', () => {
  // ניחש ניצחון חוץ (יחס גבוה) אבל יצא תיקו - מקבל 0, לא את היחס הגבוה
  assert.strictEqual(calculateMatchPoints(bet(0, 3), res(1, 1), ODDS), 0);
  // ניחש נכון תיקו - מקבל את יחס התיקו, לא את זה של החוץ
  assert.strictEqual(calculateMatchPoints(bet(2, 2), res(0, 0), ODDS), 1.3);
});

test('יחסים ריקים או אפסיים נחשבים כמשחק ללא יחסים', () => {
  for (const odds of [null, undefined, {}, { homeWin: 0, draw: 0, awayWin: 0 }]) {
    assert.strictEqual(calculateMatchPoints(bet(2, 1), res(2, 1), odds), 3, JSON.stringify(odds));
    assert.strictEqual(calculateMatchPoints(bet(2, 1), res(3, 0), odds), 1, JSON.stringify(odds));
  }
});

test('יחס חסר לתוצאה שקרתה נופל ל-1 ולא מאפס', () => {
  const partial = { homeWin: 2.4 }; // אין יחס לתיקו
  assert.strictEqual(calculateMatchPoints(bet(1, 1), res(1, 1), partial), 0.7); // 1*2/3
  assert.strictEqual(calculateMatchPoints(bet(2, 2), res(1, 1), partial), 0.3); // 1/3
});

test('אין ניקוד שלילי ואין ניקוד גדול מהמקסימום התיאורטי', () => {
  const odds = { homeWin: 12.75, draw: 7.5, awayWin: 1.05 };
  for (let p1 = 0; p1 <= 5; p1++) for (let p2 = 0; p2 <= 5; p2++)
  for (let r1 = 0; r1 <= 5; r1++) for (let r2 = 0; r2 <= 5; r2++) {
    const pts = calculateMatchPoints(bet(p1, p2), res(r1, r2), odds);
    assert.ok(pts >= 0, `ניקוד שלילי ב-${p1}-${p2} מול ${r1}-${r2}`);
    assert.ok(pts <= 12.75 * 2 / 3, `ניקוד חריג ב-${p1}-${p2} מול ${r1}-${r2}: ${pts}`);
  }
});

test('outcomeOf מזהה נכון את שלושת הכיוונים', () => {
  assert.strictEqual(outcomeOf(2, 1), 'home');
  assert.strictEqual(outcomeOf(1, 2), 'away');
  assert.strictEqual(outcomeOf(0, 0), 'draw');
});

// === "כמה קרוב היית" ===

const { goalDistance, nearMiss } = require('./scoring');

test('מרחק בשערים נספר משני הצדדים', () => {
  assert.strictEqual(goalDistance(bet(2, 1), res(2, 1)), 0);
  assert.strictEqual(goalDistance(bet(2, 0), res(2, 1)), 1);
  assert.strictEqual(goalDistance(bet(1, 0), res(2, 1)), 2);
  assert.strictEqual(goalDistance(bet(0, 3), res(3, 0)), 6);
});

test('בול: מרחק 0 ואפס נקודות שאבדו', () => {
  const nm = nearMiss(bet(2, 1), res(2, 1), null);
  assert.strictEqual(nm.distance, 0);
  assert.strictEqual(nm.points, 3);
  assert.strictEqual(nm.lost, 0);
});

test('שער אחד מבול, עם כיוון נכון: אבדו 2 נקודות', () => {
  // ניחש 2-0, יצא 2-1. קיבל נקודה על הכיוון, בול היה נותן 3.
  const nm = nearMiss(bet(2, 0), res(2, 1), null);
  assert.strictEqual(nm.distance, 1);
  assert.strictEqual(nm.points, 1);
  assert.strictEqual(nm.pointsIfExact, 3);
  assert.strictEqual(nm.lost, 2);
});

test('שער אחד מבול, כיוון שגוי: אבדו כל 3 הנקודות', () => {
  // ניחש 1-1 (תיקו), יצא 2-1 (ניצחון בית). שער אחד, ובכל זאת אפס.
  const nm = nearMiss(bet(1, 1), res(2, 1), null);
  assert.strictEqual(nm.distance, 1);
  assert.strictEqual(nm.points, 0);
  assert.strictEqual(nm.lost, 3);
});

test('הניקוד שאבד מחושב לפי היחס של התוצאה שקרתה', () => {
  const odds = { homeWin: 1.5, draw: 3.9, awayWin: 6.2 };
  // יצא 0-2 - ניצחון חוץ, יחס 6.2. בול היה 4.1, כיוון נכון נותן 2.1.
  const nm = nearMiss(bet(0, 1), res(0, 2), odds);
  assert.strictEqual(nm.distance, 1);
  assert.strictEqual(nm.points, 2.1);
  assert.strictEqual(nm.pointsIfExact, 4.1);
  assert.strictEqual(nm.lost, 2);
});

test('יחס גבוה שהוחמץ עולה יותר מיחס נמוך', () => {
  const odds = { homeWin: 1.2, draw: 4.0, awayWin: 9.0 };
  const cheapMiss = nearMiss(bet(2, 0), res(1, 0), odds);   // ניצחון בית, יחס 1.2
  const pricyMiss = nearMiss(bet(0, 2), res(0, 1), odds);   // ניצחון חוץ, יחס 9.0
  assert.ok(pricyMiss.lost > cheapMiss.lost,
    `החמצה יקרה (${pricyMiss.lost}) אמורה לעלות יותר מזולה (${cheapMiss.lost})`);
});

test('לא ייתכן ניקוד שלילי שאבד', () => {
  for (let p1 = 0; p1 <= 4; p1++) for (let p2 = 0; p2 <= 4; p2++)
  for (let r1 = 0; r1 <= 4; r1++) for (let r2 = 0; r2 <= 4; r2++) {
    for (const odds of [null, { homeWin: 2.2, draw: 3.1, awayWin: 3.9 }]) {
      const nm = nearMiss(bet(p1, p2), res(r1, r2), odds);
      assert.ok(nm.lost >= 0, `${p1}-${p2} מול ${r1}-${r2}`);
      assert.ok(nm.points <= nm.pointsIfExact, `${p1}-${p2} מול ${r1}-${r2}`);
    }
  }
});

test('מרחק 0 קורה אך ורק בבול', () => {
  for (let p1 = 0; p1 <= 4; p1++) for (let p2 = 0; p2 <= 4; p2++)
  for (let r1 = 0; r1 <= 4; r1++) for (let r2 = 0; r2 <= 4; r2++) {
    const isExact = p1 === r1 && p2 === r2;
    assert.strictEqual(goalDistance(bet(p1, p2), res(r1, r2)) === 0, isExact);
  }
});
