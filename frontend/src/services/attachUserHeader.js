// כל קריאה ל-API נושאת את טוקן ההתחברות, והשרת מזהה את המשתמש רק לפיו.
//
// עד עכשיו נשלח כאן מזהה המשתמש (X-User-Id), והשרת סמך עליו - כך שכל מי
// שידע מזהה של אדמין (ורשימת המשתמשים פתוחה) יכול היה לפעול בשמו. טוקן
// נוצר רק בכניסה עם סיסמה ואי אפשר לזייף אותו.
//
// האפליקציה לא מרכזת את כל הקריאות ב-api.js - חלק מהמסכים קוראים ל-fetch
// ישירות - ולכן העטיפה יושבת במקום גלובלי אחד.

import { getToken, setToken, signalExpired } from './authSession';

const originalFetch = window.fetch.bind(window);

const isApiRequest = (url) => typeof url === 'string' && url.includes('/api/');
const isLogin = (url) => url.includes('/api/auth/login');

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!isApiRequest(url)) return originalFetch(input, init);

  const token = getToken();
  let request = init;
  if (token) {
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    request = { ...init, headers };
  }

  const response = await originalFetch(input, request);

  // טוקן שהתחדש (או טוקן חדש אחרי החלפת סיסמה) מגיע בכותרת
  const renewed = response.headers.get('X-Auth-Token');
  if (renewed) setToken(renewed);

  // השרת דחה את ההזדהות - חזרה למסך הכניסה. לא בכניסה עצמה, שם 401 פירושו
  // סיסמה שגויה
  const authStatus = response.headers.get('X-Auth-Status');
  if (response.status === 401 && authStatus && !isLogin(url)) {
    signalExpired(authStatus);
  }

  return response;
};
