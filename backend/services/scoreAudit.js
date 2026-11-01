// בדיקת ניקוד לחודש: מחשבת מחדש כל הימור ומשווה למה שנשמר במסד.
//
// קריאה בלבד - לא מתקנת כלום. מה שהיא מוצאת מתוקן ב"חשב ניקוד" של השבוע,
// שמחשב מחדש את כל ההימורים שלו.
//
// החישוב הוא אותו calculateMatchPoints שמחשב את הניקוד באפליקציה. לכן
// הבדיקה תופסת ניקוד שלא עודכן (תוצאה שתוקנה בלי חישוב מחדש, חישוב שקרס
// באמצע) ונתונים שגויים סביבו - לא באג בכלל הניקוד עצמו. את הכלל עצמו
// בודקים services/scoring.test.js.

const { calculateMatchPoints, outcomeOf } = require('./scoring');

const round1 = (n) => Math.round((n || 0) * 10) / 10;
const id = (v) => (v && v._id ? String(v._id) : v == null ? '' : String(v));
const hasResult = (m) => m && m.result && m.result.team1Goals != null && m.result.team2Goals != null;
const hasOdds = (o) => !!(o && (o.homeWin || o.draw || o.awayWin));
const ODD_KEY = { home: 'homeWin', draw: 'draw', away: 'awayWin' };

// משחק בלי תוצאה כמה שעות אחרי הבעיטה - כנראה שהתוצאה לא נכנסה
const MISSING_RESULT_AFTER_MS = 3 * 60 * 60 * 1000;

const normalizeTeam = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * @param weeks       [{ _id, name, month, season, lockTime, locked }]
 * @param matches     [{ _id, weekId, team1, team2, fullDate, date, result, odds, postponed }]
 * @param bets        [{ _id, userId, matchId, weekId, prediction, points, updatedAt }]
 * @param scores      [{ userId, weekId, weeklyScore }]
 * @param users       [{ _id, name, role }]
 * @param exclusions  [{ userId }] - מוחרגים מהחודש
 */
function buildScoreAudit({ weeks = [], matches = [], bets = [], scores = [], users = [], exclusions = [], now = Date.now() }) {
  const issues = [];
  const weekById = new Map(weeks.map((w) => [id(w), w]));
  const matchById = new Map(matches.map((m) => [id(m), m]));
  const userById = new Map(users.map((u) => [id(u), u]));
  const excluded = new Set(exclusions.map((e) => id(e.userId)));

  const label = (m) => `${m.team1} - ${m.team2}`;
  const weekName = (wid) => weekById.get(wid)?.name || '';
  const add = (severity, kind, fields) => issues.push({ severity, kind, ...fields });

  // ── משחקים ─────────────────────────────────────────────────────
  const seenFixture = new Map();
  for (const m of matches) {
    const wid = id(m.weekId);
    const base = { weekId: wid, weekName: weekName(wid), matchId: id(m), match: label(m) };

    if (!hasResult(m)) {
      const kickoff = m.fullDate ? new Date(m.fullDate).getTime() : NaN;
      if (!m.postponed && Number.isFinite(kickoff) && now - kickoff > MISSING_RESULT_AFTER_MS) {
        add('error', 'missing_result', { ...base, message: 'המשחק נגמר לפני יותר משלוש שעות ואין לו תוצאה - ההימורים עליו מקבלים 0' });
      }
    } else {
      if (hasOdds(m.odds)) {
        const outcome = outcomeOf(m.result.team1Goals, m.result.team2Goals);
        if (!m.odds[ODD_KEY[outcome]]) {
          add('warn', 'odds_fallback', { ...base, message: `יש יחסים למשחק, אבל לא לתוצאה שקרתה (${outcome === 'draw' ? 'תיקו' : outcome === 'home' ? '1' : '2'}) - הניקוד חושב לפי יחס 1` });
        }
      }
      const fs = m.result.finalScore;
      if (fs && fs.team1Goals != null && (fs.team1Goals !== m.result.team1Goals || fs.team2Goals !== m.result.team2Goals)) {
        add('info', 'extra_time', { ...base, message: `נקבע לפי 90 דקות (${m.result.team1Goals}-${m.result.team2Goals}); בסוף המשחק ${fs.team1Goals}-${fs.team2Goals}` });
      }
    }

    if (m.odds) {
      const bad = ['homeWin', 'draw', 'awayWin'].filter((k) => m.odds[k] != null && m.odds[k] !== 0 && (m.odds[k] < 1.01 || m.odds[k] > 30));
      if (bad.length) add('warn', 'odds_suspicious', { ...base, message: `יחס חריג: ${bad.map((k) => m.odds[k]).join(', ')}` });
    }

    const key = `${normalizeTeam(m.team1)}|${normalizeTeam(m.team2)}|${m.fullDate ? new Date(m.fullDate).toISOString().slice(0, 10) : m.date || ''}`;
    if (seenFixture.has(key)) {
      add('warn', 'duplicate_match', { ...base, message: `אותו משחק מופיע פעמיים (גם ב"${weekName(seenFixture.get(key))}") - הוא נספר פעמיים בניקוד` });
    } else {
      seenFixture.set(key, wid);
    }
  }

  // ── הימורים ────────────────────────────────────────────────────
  const expectedWeekly = new Map(); // `${userId}|${weekId}` -> נקודות
  const players = new Map();
  const playerOf = (uid) => {
    if (!players.has(uid)) {
      const u = userById.get(uid);
      players.set(uid, {
        userId: uid, name: u?.name || '(משתמש שנמחק)', admin: u?.role === 'admin', excluded: excluded.has(uid),
        bets: 0, settled: 0, exact: 0, direction: 0, expectedPoints: 0, storedPoints: 0, mismatches: 0
      });
    }
    return players.get(uid);
  };
  const weekStats = new Map(weeks.map((w) => [id(w), { weekId: id(w), name: w.name, matches: 0, withResult: 0, bets: 0, mismatches: 0 }]));
  for (const m of matches) {
    const ws = weekStats.get(id(m.weekId));
    if (ws) { ws.matches++; if (hasResult(m)) ws.withResult++; }
  }

  let checked = 0;
  for (const b of bets) {
    const m = matchById.get(id(b.matchId));
    if (!m) continue;
    const uid = id(b.userId);
    const wid = id(m.weekId);
    const p = playerOf(uid);
    const ws = weekStats.get(wid);
    p.bets++;
    if (ws) ws.bets++;

    // כמו החישוב עצמו: משחק בלי תוצאה = 0
    const expected = hasResult(m) ? calculateMatchPoints(b.prediction, m.result, m.odds) : 0;
    const stored = b.points || 0;
    checked++;

    if (hasResult(m)) {
      p.settled++;
      const exact = b.prediction.team1Goals === m.result.team1Goals && b.prediction.team2Goals === m.result.team2Goals;
      if (exact) p.exact++;
      else if (outcomeOf(b.prediction.team1Goals, b.prediction.team2Goals) === outcomeOf(m.result.team1Goals, m.result.team2Goals)) p.direction++;
    }
    p.expectedPoints += expected;
    const k = `${uid}|${wid}`;
    expectedWeekly.set(k, (expectedWeekly.get(k) || 0) + expected);

    const base = { weekId: wid, weekName: weekName(wid), matchId: id(m), match: label(m), userId: uid, user: p.name };

    if (Math.abs(stored - expected) > 0.001) {
      p.mismatches++;
      if (ws) ws.mismatches++;
      add('error', 'bet_points', {
        ...base, expected: round1(expected), stored: round1(stored),
        message: `ניחש ${b.prediction.team1Goals}-${b.prediction.team2Goals}` +
          (hasResult(m) ? `, תוצאה ${m.result.team1Goals}-${m.result.team2Goals}` : ', אין תוצאה') +
          ` - שמור ${round1(stored)}, צריך ${round1(expected)}`
      });
    }

    if (b.weekId && id(b.weekId) !== wid) {
      add('warn', 'bet_week_mismatch', { ...base, message: `ההימור רשום על "${weekName(id(b.weekId)) || 'שבוע אחר'}" אבל המשחק שייך ל"${weekName(wid)}"` });
    }

    const week = weekById.get(wid);
    if (week?.lockTime && b.updatedAt && new Date(b.updatedAt) > new Date(week.lockTime) && !p.admin) {
      add('info', 'bet_after_lock', { ...base, message: `ההימור עודכן אחרי הנעילה (${new Date(b.updatedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}) - כנראה תיקון של אדמין` });
    }
  }

  // ── ניקוד שבועי שמור ───────────────────────────────────────────
  const storedWeekly = new Map(scores.map((s) => [`${id(s.userId)}|${id(s.weekId)}`, s.weeklyScore || 0]));
  for (const s of scores) {
    const uid = id(s.userId);
    if (weekById.has(id(s.weekId))) playerOf(uid).storedPoints += s.weeklyScore || 0;
  }
  const keys = new Set([...expectedWeekly.keys(), ...storedWeekly.keys()]);
  for (const k of keys) {
    const [uid, wid] = k.split('|');
    if (!weekById.has(wid)) continue;
    const expected = round1(expectedWeekly.get(k) || 0);
    const hasStored = storedWeekly.has(k);
    const stored = round1(storedWeekly.get(k) || 0);
    if (Math.abs(expected - stored) > 0.05 && (hasStored || expected > 0)) {
      const p = playerOf(uid);
      const ws = weekStats.get(wid);
      if (ws) ws.mismatches++;
      add('error', 'weekly_score', {
        weekId: wid, weekName: weekName(wid), userId: uid, user: p.name, expected, stored,
        message: hasStored
          ? `ניקוד השבוע השמור ${stored}, סכום ההימורים ${expected} - זה מה שהטבלה מציגה`
          : `אין רשומת ניקוד לשבוע, אבל ההימורים שווים ${expected} - לא מופיע בטבלה`
      });
    }
  }

  const severityRank = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.weekName.localeCompare(b.weekName, 'he'));

  const playerRows = [...players.values()]
    .map((p) => ({ ...p, expectedPoints: round1(p.expectedPoints), storedPoints: round1(p.storedPoints) }))
    .sort((a, b) => Number(a.admin) - Number(b.admin) || b.expectedPoints - a.expectedPoints);

  const weekRows = [...weekStats.values()].map((w) => ({ ...w, needsRecalc: w.mismatches > 0 }));

  return {
    summary: {
      weeks: weeks.length,
      matches: matches.length,
      matchesWithResult: matches.filter(hasResult).length,
      betsChecked: checked,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warn').length,
      notes: issues.filter((i) => i.severity === 'info').length
    },
    weeks: weekRows,
    players: playerRows,
    issues
  };
}

module.exports = { buildScoreAudit };
