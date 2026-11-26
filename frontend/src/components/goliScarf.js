import { getTheme } from '../themes';

// צעיף לגולי בצבעי הקבוצה של השחקן (ערכת הנושא שבחר). ערכה בסיסית = בלי
// צעיף. מחזיר [ראשי, משני] או null
export const teamScarf = () => {
  try {
    const u = JSON.parse(localStorage.getItem('football_betting_user') || '{}');
    if (!u.theme || u.theme === 'default') return null;
    const c = getTheme(u.theme).colors || {};
    if (!c.primary) return null;
    const secondary = c.secondary && c.secondary.toLowerCase() !== c.primary.toLowerCase() ? c.secondary : '#ffffff';
    return [c.primary, secondary];
  } catch (e) {
    return null;
  }
};
