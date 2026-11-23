// המקום של שחקן בטבלה החודשית, לכותרת. אותם כללים בדיוק כמו לשונית
// "חודשי" בטבלה (frontend/src/components/player/Leaderboard.js), אחרת המספר
// בכותרת לא יתאים למה שהשחקן רואה בטבלה:
//   - החודש והעונה של השבוע הפעיל האחרון שנוצר
//   - רק שבועות פעילים באותו חודש ועונה
//   - שחקן שהוחרג מהחודש לא נספר; מנהלים לא נספרים
//   - תיקו חולק מקום (1, 1, 3)
const DEFAULT_SEASON = '2025-26';
const monthOf = (w) => w.month || new Date(w.createdAt).getMonth() + 1;
const round1 = (n) => Math.round(n * 10) / 10;

const computeStanding = ({ weeks, scores, excludedUserIds = [], userId }) => {
  const active = (weeks || []).filter((w) => w && w.active);
  if (active.length === 0) return null;
  const latest = [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const month = monthOf(latest);
  const season = latest.season || DEFAULT_SEASON;
  const weekIds = new Set(active
    .filter((w) => monthOf(w) === month && (w.season || DEFAULT_SEASON) === season)
    .map((w) => String(w._id)));
  const excluded = new Set(excludedUserIds.map(String));

  const totals = new Map();
  for (const s of scores || []) {
    const uid = String(s.userId);
    if (excluded.has(uid)) continue;
    if (!totals.has(uid)) totals.set(uid, 0);
    if (weekIds.has(String(s.weekId))) totals.set(uid, totals.get(uid) + (s.weeklyScore || 0));
  }
  const me = String(userId);
  if (!totals.has(me)) return { month, season, rank: null, of: totals.size, points: 0 };
  const mine = round1(totals.get(me));
  const rank = 1 + [...totals.values()].filter((v) => round1(v) > mine).length;
  return { month, season, rank, of: totals.size, points: mine };
};

module.exports = { computeStanding };
