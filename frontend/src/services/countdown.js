// ניסוח הספירה לאחור עד נעילת ההימורים.
//
// כשנשאר יותר מיום, השעון "1 17:22:22" לא נקרא כמו זמן - שתי תיבות נראו
// כמו שני דברים נפרדים. לכן מעל יום כותבים משפט ("יום ו־17 שעות"), ורק
// ביום האחרון עוברים לשעון מתקתק, שם הוא באמת מועיל.

const days = (n) => (n === 1 ? 'יום' : n === 2 ? 'יומיים' : `${n} ימים`);
const hours = (n) => (n === 1 ? 'שעה' : n === 2 ? 'שעתיים' : `${n} שעות`);
const pad = (n) => String(n).padStart(2, '0');

/**
 * @returns {{ text: string, clock: boolean }} clock=true כשהטקסט הוא שעון
 */
export function formatCountdown({ days: d, hours: h, minutes: m, seconds: s }) {
  if (d >= 1) {
    if (!h) return { text: days(d), clock: false };
    // "ו" צמודה למילה ("ושעה"), ועם מספר - ו־ ומקף עברי ("ו־17 שעות")
    const and = h <= 2 ? `ו${hours(h)}` : `ו־${hours(h)}`;
    return { text: `${days(d)} ${and}`, clock: false };
  }
  if (h >= 1) return { text: `${pad(h)}:${pad(m)}:${pad(s)}`, clock: true };
  return { text: `${pad(m)}:${pad(s)}`, clock: true };
}

/** "יום שישי 7.11 · 14:30" */
export function formatLockMoment(lockTime) {
  const d = new Date(lockTime);
  if (Number.isNaN(d.getTime())) return '';
  const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
  return `${weekday} ${d.getDate()}.${d.getMonth() + 1} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
