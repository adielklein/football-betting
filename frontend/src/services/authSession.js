// טוקן ההתחברות, בנפרד מאובייקט המשתמש.
//
// אובייקט המשתמש נכתב מחדש לאחסון מכל מיני מקומות (ערכת נושא, פרופיל) מתוך
// עותק שיושב ב-state. אם הטוקן היה בתוכו, טוקן שהתחדש (או טוקן חדש אחרי
// החלפת סיסמה) היה נדרס בעותק הישן - והמשתמש היה מנותק בלי סיבה נראית.

const TOKEN_KEY = 'football_betting_token';
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch (err) {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    // אחסון חסום (גלישה פרטית) - החיבור יחזיק רק עד רענון
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    // אין מה לנקות
  }
};

// השרת דחה את הטוקן (פג, בוטל בהחלפת סיסמה). האפליקציה מקשיבה ומחזירה
// למסך הכניסה עם הסבר
export const signalExpired = (reason) => {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason } }));
};
