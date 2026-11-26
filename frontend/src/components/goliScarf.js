import { getTheme } from '../themes';

// צעיף לגולי בצבעי הקבוצה של השחקן (ערכת הנושא שבחר). ערכה בסיסית = בלי
// צעיף. מחזיר [ראשי, משני, סמל] (הסמל - כתובת תמונה, או null) או null
export const teamScarf = () => {
  try {
    const u = JSON.parse(localStorage.getItem('football_betting_user') || '{}');
    if (!u.theme || u.theme === 'default') return null;
    const t = getTheme(u.theme);
    const c = t.colors || {};
    if (!c.primary) return null;
    const secondary = c.secondary && c.secondary.toLowerCase() !== c.primary.toLowerCase() ? c.secondary : '#ffffff';
    return [c.primary, secondary, t.logoType === 'image' ? t.logo : null];
  } catch (e) {
    return null;
  }
};
