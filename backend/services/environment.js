// באיזו סביבה השרת רץ. APP_ENV=staging בשירות הניסוי ב-Render, ובלעדיו -
// השרת האמיתי. כל מה שמתנהג אחרת בסביבת הניסוי נשען על הדגל הזה בלבד.
const APP_ENV = process.env.APP_ENV === 'staging' ? 'staging' : 'production';
const IS_STAGING = APP_ENV === 'staging';

module.exports = { APP_ENV, IS_STAGING };
