// לאיזה שרת האפליקציה פונה. מקום אחד לכל המסכים.
//
// הקביעה לפי שם האתר שבו האפליקציה רצה, ולא לפי משתנה סביבה: פעם מסך
// השבועות הסתמך על משתנה, ובלעדיו נפל ל-localhost והתנתק בייצור.
//   localhost                         -> שרת מקומי
//   אתר ששמו מכיל "staging"           -> שרת הניסוי (סביבת ניסוי ב-Render)
//   כל השאר                           -> השרת האמיתי
// VITE_API_URL, אם הוגדר בבנייה, גובר על כל אלה.
const host = typeof window !== 'undefined' ? window.location.hostname : '';

export const IS_STAGING = /staging/i.test(host);

export const STAGING_API = 'https://football-betting-backend-staging.onrender.com/api';
export const PRODUCTION_API = 'https://football-betting-backend.onrender.com/api';

export const API_URL =
  import.meta.env?.VITE_API_URL ||
  (host === 'localhost' ? 'http://localhost:5000/api' : IS_STAGING ? STAGING_API : PRODUCTION_API);
