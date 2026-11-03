// השוואת שמות קבוצות בין המסד שלנו לספק (עברית מול עברית, עברית מול אנגלית).
// הועבר מ-routes/external.js כדי שגם התוצאות החיות יוכלו לזהות סדר הפוך.

const { hebrewToEnglish } = require('./teamNames');

// נרמול שם קבוצה לצורך השוואה
// - מסיר accents (é→e, í→i)
// - מסיר גרשיים, רווחים, אותיות גדולות
// - מסיר סיומות נפוצות (FC, CF, RCD, AFC, Club, de, etc.)
const normalizeTeamName = (s) => {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/["'״׳’“”`]/g, '')
    .replace(/\b(fc|cf|rcd|afc|cd|ud|ac|as|sc|cda)\b/g, '')
    .replace(/\bf\.?c\.?\b/g, '')
    .replace(/\bfootball club\b/g, '')
    .replace(/\b(club|de|del|the|hotspur)\b/g, '')
    .replace(/[^a-z0-9֐-׿]+/g, '')
    .trim();
};

// בודק אם שתי קבוצות תואמות (בכל סדר). תומך גם ב-Hebrew-English mismatch.
const matchesPair = (a1, a2, b1, b2) => {
  const eq = (x, y) => x && y && (x === y || x.includes(y) || y.includes(x));
  // ניסיון ישיר (אותה שפה)
  const A1 = normalizeTeamName(a1), A2 = normalizeTeamName(a2);
  const B1 = normalizeTeamName(b1), B2 = normalizeTeamName(b2);
  if ((eq(A1, B1) && eq(A2, B2)) || (eq(A1, B2) && eq(A2, B1))) return true;
  // אם a1/a2 בעברית - נתרגם לאנגלית וננסה שוב
  const aEn1 = normalizeTeamName(hebrewToEnglish(a1));
  const aEn2 = normalizeTeamName(hebrewToEnglish(a2));
  if ((eq(aEn1, B1) && eq(aEn2, B2)) || (eq(aEn1, B2) && eq(aEn2, B1))) return true;
  // וגם להפך - אם b1/b2 בעברית
  const bEn1 = normalizeTeamName(hebrewToEnglish(b1));
  const bEn2 = normalizeTeamName(hebrewToEnglish(b2));
  if ((eq(A1, bEn1) && eq(A2, bEn2)) || (eq(A1, bEn2) && eq(A2, bEn1))) return true;
  return false;
};

// בודק אם שני שמות מתארים את אותה קבוצה (תומך עברית מול אנגלית)
const sameTeam = (a, b) => {
  if (!a || !b) return false;
  const eq = (x, y) => x && y && (x === y || x.includes(y) || y.includes(x));
  const A = normalizeTeamName(a), B = normalizeTeamName(b);
  if (eq(A, B)) return true;
  return eq(normalizeTeamName(hebrewToEnglish(a)), B) || eq(A, normalizeTeamName(hebrewToEnglish(b)));
};

// זיהוי הכיוון יושב במודול נפרד כדי שאפשר יהיה לבדוק אותו ישירות
// (ראה services/orientation.test.js). ההשוואה בין שמות מוזרקת אליו.
const detectOrientation = require('../services/orientation').buildDetector(sameTeam);

module.exports = { normalizeTeamName, matchesPair, sameTeam, detectOrientation };
