// כל קריאה ל-API נושאת את מזהה המשתמש, כדי שהשרת יוכל לאמת הרשאות לפני
// פעולות ניהוליות. האפליקציה לא מרכזת את כל הקריאות ב-api.js - חלק מהמסכים
// קוראים ל-fetch ישירות - ולכן העטיפה יושבת במקום גלובלי אחד במקום ב-32
// נקודות קריאה נפרדות.

const STORAGE_KEY = 'football_betting_user';
const originalFetch = window.fetch.bind(window);

const currentUserId = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id || user?._id || null;
  } catch (err) {
    // localStorage חסום (גלישה פרטית וכדומה) - פשוט לא מוסיפים כותרת
    return null;
  }
};

const isApiRequest = (url) => typeof url === 'string' && url.includes('/api/');

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!isApiRequest(url)) return originalFetch(input, init);

  const userId = currentUserId();
  if (!userId) return originalFetch(input, init);

  const headers = new Headers(
    init.headers || (typeof input !== 'string' ? input.headers : undefined)
  );
  headers.set('X-User-Id', userId);

  return originalFetch(input, { ...init, headers });
};
