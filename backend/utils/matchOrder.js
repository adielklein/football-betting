// סדר המשחקים בשבוע, בכל המסכים (מנהל ושחקנים): קודם לפי ליגה, ובתוך כל
// ליגה לפי מועד המשחק. בלי זה המשחקים הופיעו לפי סדר ההוספה, ומשחק שנוסף
// מאוחר יותר קפץ לסוף הרשימה גם אם הוא הראשון שמשוחק.
//
// סדר הליגות: "סדר תצוגה" (order) שנקבע בניהול הליגות, ואז שם הליגה.
// משחק בלי ליגה - בסוף. מועד: fullDate, ובלעדיו זמן ההוספה.

const leagueKey = (league) => ({
  missing: league ? 0 : 1,
  order: Number.isFinite(Number(league?.order)) ? Number(league.order) : 0,
  name: String(league?.name || '')
});

const timeOf = (m) => {
  const t = new Date(m.fullDate || m.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

// leagueOf(match) מחזיר את מסמך הליגה (או null). ברירת מחדל: leagueId מאוכלס
const sortMatches = (matches, leagueOf = (m) => (m.leagueId && typeof m.leagueId === 'object' && m.leagueId.name !== undefined ? m.leagueId : null)) =>
  [...(matches || [])].sort((a, b) => {
    const la = leagueKey(leagueOf(a));
    const lb = leagueKey(leagueOf(b));
    return (la.missing - lb.missing)
      || (la.order - lb.order)
      || la.name.localeCompare(lb.name, 'he')
      || (timeOf(a) - timeOf(b))
      || (new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  });

module.exports = { sortMatches };
